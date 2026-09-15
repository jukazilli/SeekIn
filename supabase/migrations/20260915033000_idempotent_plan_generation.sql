create function public.persist_idempotent_plan_proposal(
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
  v_key private.idempotency_keys%rowtype;
  v_proposal jsonb;
  v_saved_output jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;

  -- The user lock makes version assignment and idempotency resolution one ordered operation.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select *
  into v_key
  from private.idempotency_keys
  where user_id = v_user_id
    and scope = 'planner.generate'
    and key_hash = p_idempotency_key_hash
  for update;

  if found and v_key.expires_at > statement_timestamp() then
    if v_key.request_hash <> p_request_hash then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;

    if v_key.status = 'completed' and v_key.response_reference is not null then
      select jsonb_build_object(
        'planId', p.id,
        'version', p.version,
        'status', p.status,
        'feasibility', p.feasibility,
        'requiresConfirmation', p.requires_confirmation
      ), pr.output_snapshot
      into v_proposal, v_saved_output
      from public.plans p
      join private.planner_runs pr
        on pr.user_id = p.user_id
       and pr.plan_id = p.id
       and pr.idempotency_key_id = v_key.id
      where p.user_id = v_user_id
        and p.id = v_key.response_reference::uuid
        and pr.status = 'completed'
      order by pr.created_at desc
      limit 1;

      if v_proposal is null or v_saved_output is null then
        raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_STATE_INVALID';
      end if;

      return jsonb_build_object(
        'proposal', v_proposal,
        'output', v_saved_output,
        'replayed', true
      );
    end if;

    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_STATE_INVALID';
  end if;

  if found then
    update private.idempotency_keys
    set request_hash = p_request_hash,
        status = 'in_progress',
        response_reference = null,
        expires_at = statement_timestamp() + interval '24 hours',
        updated_at = statement_timestamp()
    where id = v_key.id
    returning * into v_key;
  else
    insert into private.idempotency_keys (
      user_id,
      scope,
      key_hash,
      request_hash,
      status,
      expires_at
    )
    values (
      v_user_id,
      'planner.generate',
      p_idempotency_key_hash,
      p_request_hash,
      'in_progress',
      statement_timestamp() + interval '24 hours'
    )
    returning * into v_key;
  end if;

  v_proposal := public.persist_plan_proposal(
    p_generation_reason,
    p_expected_current_plan_id,
    p_input,
    p_output,
    p_correlation_id
  );

  update private.planner_runs
  set idempotency_key_id = v_key.id
  where user_id = v_user_id
    and plan_id = (v_proposal ->> 'planId')::uuid
    and status = 'completed';

  if not found then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_STATE_INVALID';
  end if;

  update private.idempotency_keys
  set status = 'completed',
      response_reference = v_proposal ->> 'planId',
      updated_at = statement_timestamp()
  where id = v_key.id;

  return jsonb_build_object(
    'proposal', v_proposal,
    'output', p_output,
    'replayed', false
  );
end;
$$;

revoke all on function public.persist_plan_proposal(text, uuid, jsonb, jsonb, text)
from authenticated;

revoke all on function public.persist_idempotent_plan_proposal(
  text, uuid, jsonb, jsonb, text, text, text
)
from public, anon;
grant execute on function public.persist_idempotent_plan_proposal(
  text, uuid, jsonb, jsonb, text, text, text
)
to authenticated;

comment on function public.persist_idempotent_plan_proposal(
  text, uuid, jsonb, jsonb, text, text, text
) is
  'Persiste ou reproduz por 24 horas uma proposta do planner, sem armazenar a chave original.';
