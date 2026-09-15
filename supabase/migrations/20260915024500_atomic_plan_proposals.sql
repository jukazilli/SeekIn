create function public.persist_plan_proposal(
  p_generation_reason text,
  p_expected_current_plan_id uuid,
  p_input jsonb,
  p_output jsonb,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_plan_id uuid;
  v_plan_id uuid := gen_random_uuid();
  v_version integer;
  v_session jsonb;
  v_conflict jsonb;
  v_conflict_id uuid;
  v_activity_id jsonb;
  v_started_at timestamptz := statement_timestamp();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if p_generation_reason is null or btrim(p_generation_reason) = '' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  if p_correlation_id is null or btrim(p_correlation_id) = '' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  if jsonb_typeof(p_input) <> 'object' or jsonb_typeof(p_output) <> 'object' then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;
  if (p_output ->> 'contractVersion')::integer <> 1
    or p_output ->> 'plannerVersion' is null
    or p_output ->> 'rulesVersion' is null
    or p_output ->> 'inputHash' !~ '^[0-9a-f]{64}$'
    or p_output ->> 'outputHash' !~ '^[0-9a-f]{64}$'
    or p_output ->> 'feasibility' not in ('feasible', 'partial', 'infeasible')
    or p_output ->> 'requiresConfirmation' <> 'true'
    or jsonb_typeof(p_output -> 'sessions') <> 'array'
    or jsonb_typeof(p_output -> 'conflicts') <> 'array'
  then
    raise exception using errcode = '22023', message = 'VALIDATION_ERROR';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select id
  into v_current_plan_id
  from public.plans
  where user_id = v_user_id and status = 'published'
  for update;

  if v_current_plan_id is distinct from p_expected_current_plan_id then
    raise exception using errcode = 'P0001', message = 'STALE_PLAN';
  end if;

  select coalesce(max(version), 0) + 1
  into v_version
  from public.plans
  where user_id = v_user_id;

  insert into public.plans (
    id,
    user_id,
    version,
    status,
    feasibility,
    generation_reason,
    horizon_start_date,
    horizon_end_date,
    timezone,
    planner_version,
    rules_version,
    input_hash,
    output_hash,
    requires_confirmation
  )
  values (
    v_plan_id,
    v_user_id,
    v_version,
    'proposal',
    p_output ->> 'feasibility',
    p_generation_reason,
    (p_input ->> 'horizonStartDate')::date,
    (p_input ->> 'horizonEndDate')::date,
    p_input ->> 'timezone',
    p_output ->> 'plannerVersion',
    p_output ->> 'rulesVersion',
    p_output ->> 'inputHash',
    p_output ->> 'outputHash',
    true
  );

  for v_session in
    select value from jsonb_array_elements(p_output -> 'sessions')
  loop
    insert into public.study_sessions (
      id,
      user_id,
      activity_id,
      source,
      created_by_plan_id
    )
    values (
      (v_session ->> 'sessionId')::uuid,
      v_user_id,
      (v_session ->> 'activityId')::uuid,
      'automatic',
      v_plan_id
    )
    on conflict (id) do nothing;

    if not exists (
      select 1 from public.study_sessions
      where id = (v_session ->> 'sessionId')::uuid
        and user_id = v_user_id
        and activity_id = (v_session ->> 'activityId')::uuid
        and source = 'automatic'
    ) then
      raise exception using errcode = '23503', message = 'SESSION_ID_CONFLICT';
    end if;

    insert into public.plan_items (
      user_id,
      plan_id,
      session_id,
      planned_start_at,
      planned_end_at,
      planned_minutes,
      change_kind,
      rationale_code,
      rationale_params
    )
    values (
      v_user_id,
      v_plan_id,
      (v_session ->> 'sessionId')::uuid,
      (v_session ->> 'startsAt')::timestamptz,
      (v_session ->> 'endsAt')::timestamptz,
      (v_session ->> 'plannedMinutes')::integer,
      v_session ->> 'changeKind',
      v_session ->> 'rationaleCode',
      '{}'::jsonb
    );
  end loop;

  for v_conflict in
    select value from jsonb_array_elements(p_output -> 'conflicts')
  loop
    v_conflict_id := gen_random_uuid();
    insert into public.plan_conflicts (
      id,
      user_id,
      plan_id,
      code,
      first_affected_deadline_at,
      deficit_minutes,
      largest_available_window_minutes,
      details
    )
    values (
      v_conflict_id,
      v_user_id,
      v_plan_id,
      v_conflict ->> 'code',
      (v_conflict ->> 'firstAffectedDeadlineAt')::timestamptz,
      (v_conflict ->> 'deficitMinutes')::integer,
      (v_conflict ->> 'largestAvailableWindowMinutes')::integer,
      '{}'::jsonb
    );

    for v_activity_id in
      select value from jsonb_array_elements(v_conflict -> 'activityIds')
    loop
      insert into public.plan_conflict_activities (
        conflict_id,
        activity_id,
        user_id
      )
      values (
        v_conflict_id,
        (v_activity_id #>> '{}')::uuid,
        v_user_id
      );
    end loop;
  end loop;

  insert into private.planner_runs (
    user_id,
    plan_id,
    contract_version,
    rules_version,
    status,
    started_at,
    finished_at,
    duration_ms,
    input_snapshot,
    output_snapshot
  )
  values (
    v_user_id,
    v_plan_id,
    p_output ->> 'contractVersion',
    p_output ->> 'rulesVersion',
    'completed',
    v_started_at,
    clock_timestamp(),
    greatest(0, floor(extract(epoch from (clock_timestamp() - v_started_at)) * 1000)::integer),
    p_input,
    p_output
  );

  insert into private.audit_events (
    user_id,
    actor_type,
    action,
    entity_type,
    entity_id,
    correlation_id,
    changed_fields
  )
  values (
    v_user_id,
    'user',
    'plan.proposal_created',
    'plan',
    v_plan_id,
    p_correlation_id,
    array['status', 'version', 'sessions', 'conflicts']
  );

  return jsonb_build_object(
    'planId', v_plan_id,
    'version', v_version,
    'status', 'proposal',
    'feasibility', p_output ->> 'feasibility',
    'requiresConfirmation', true
  );
end;
$$;

revoke all on function public.persist_plan_proposal(text, uuid, jsonb, jsonb, text)
from public, anon;
grant execute on function public.persist_plan_proposal(text, uuid, jsonb, jsonb, text)
to authenticated;

comment on function public.persist_plan_proposal(text, uuid, jsonb, jsonb, text) is
  'Persiste uma proposta completa do planner de forma atômica e serializada por usuário.';
