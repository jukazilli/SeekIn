create function public.resolve_plan_proposal(
  p_action text,
  p_plan_id uuid,
  p_expected_current_plan_id uuid,
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
  v_proposal public.plans%rowtype;
  v_current_plan_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if p_action not in ('confirm', 'reject')
    or p_plan_id is null
    or p_correlation_id is null
    or btrim(p_correlation_id) = ''
    or p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
    or p_request_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select *
  into v_key
  from private.idempotency_keys
  where user_id = v_user_id
    and scope = 'planner.resolve'
    and key_hash = p_idempotency_key_hash
  for update;

  if found and v_key.expires_at > statement_timestamp() then
    if v_key.request_hash <> p_request_hash then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    if v_key.status = 'completed' and v_key.response_reference is not null then
      return (v_key.response_reference::jsonb) || jsonb_build_object('replayed', true);
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
      user_id, scope, key_hash, request_hash, status, expires_at
    )
    values (
      v_user_id, 'planner.resolve', p_idempotency_key_hash, p_request_hash,
      'in_progress', statement_timestamp() + interval '24 hours'
    )
    returning * into v_key;
  end if;

  select id
  into v_current_plan_id
  from public.plans
  where user_id = v_user_id and status = 'published'
  for update;

  if v_current_plan_id is distinct from p_expected_current_plan_id then
    raise exception using errcode = 'P0001', message = 'STALE_PLAN';
  end if;

  select *
  into v_proposal
  from public.plans
  where user_id = v_user_id and id = p_plan_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'RESOURCE_NOT_FOUND';
  end if;
  if v_proposal.status <> 'proposal' then
    raise exception using errcode = 'P0001', message = 'STALE_PLAN';
  end if;

  if p_action = 'confirm' then
    if v_current_plan_id is not null then
      update public.plans
      set status = 'superseded'
      where user_id = v_user_id and id = v_current_plan_id;
    end if;

    update public.plans
    set status = 'published',
        confirmed_at = statement_timestamp(),
        published_at = statement_timestamp()
    where user_id = v_user_id and id = p_plan_id;

    v_result := jsonb_build_object(
      'planId', p_plan_id,
      'version', v_proposal.version,
      'status', 'published',
      'currentPlanId', p_plan_id,
      'replayed', false
    );
  else
    update public.plans
    set status = 'rejected'
    where user_id = v_user_id and id = p_plan_id;

    v_result := jsonb_build_object(
      'planId', p_plan_id,
      'version', v_proposal.version,
      'status', 'rejected',
      'currentPlanId', v_current_plan_id,
      'replayed', false
    );
  end if;

  insert into private.audit_events (
    user_id, actor_type, action, entity_type, entity_id, correlation_id,
    changed_fields
  )
  values (
    v_user_id,
    'user',
    case when p_action = 'confirm' then 'plan.published' else 'plan.proposal_rejected' end,
    'plan',
    p_plan_id,
    p_correlation_id,
    array['status']
  );

  update private.idempotency_keys
  set status = 'completed',
      response_reference = v_result::text,
      updated_at = statement_timestamp()
  where id = v_key.id;

  return v_result;
end;
$$;

revoke all on function public.resolve_plan_proposal(text, uuid, uuid, text, text, text)
from public, anon;
grant execute on function public.resolve_plan_proposal(text, uuid, uuid, text, text, text)
to authenticated;

comment on function public.resolve_plan_proposal(text, uuid, uuid, text, text, text) is
  'Confirma ou rejeita uma proposta de forma atômica, serializada e idempotente.';
