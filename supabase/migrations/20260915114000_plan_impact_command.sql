create function public.persist_idempotent_plan_impact(
  p_generation_reason text,
  p_expected_current_plan_id uuid,
  p_input jsonb,
  p_output jsonb,
  p_correlation_id text,
  p_idempotency_key_hash text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_scoped_key_hash text;
  v_key_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  v_scoped_key_hash := encode(
    extensions.digest('planner.impact:' || p_idempotency_key_hash, 'sha256'),
    'hex'
  );

  -- Reuse the proven transactional primitive while keeping a distinct command scope.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select id
  into v_key_id
  from private.idempotency_keys
  where user_id = v_user_id
    and scope = 'planner.impact'
    and key_hash = v_scoped_key_hash
  for update;

  if found then
    update private.idempotency_keys
    set scope = 'planner.generate'
    where id = v_key_id;
  end if;

  v_result := public.persist_idempotent_plan_proposal(
    p_generation_reason,
    p_expected_current_plan_id,
    p_input,
    p_output,
    p_correlation_id,
    v_scoped_key_hash,
    p_request_hash
  );

  update private.idempotency_keys
  set scope = 'planner.impact'
  where user_id = v_user_id
    and scope = 'planner.generate'
    and key_hash = v_scoped_key_hash;

  return v_result;
end;
$$;

revoke all on function public.persist_idempotent_plan_impact(
  text, uuid, jsonb, jsonb, text, text, text
)
from public, anon;
grant execute on function public.persist_idempotent_plan_impact(
  text, uuid, jsonb, jsonb, text, text, text
)
to authenticated;

comment on function public.persist_idempotent_plan_impact(
  text, uuid, jsonb, jsonb, text, text, text
) is
  'Persiste ou reproduz uma proposta de impacto no escopo planner.impact sem publicar o plano.';
