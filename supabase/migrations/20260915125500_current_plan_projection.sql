create function public.read_current_plan()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with current_plan as (
    select p.*
    from public.plans p
    where p.user_id = auth.uid()
      and p.status = 'published'
    limit 1
  ),
  current_run as (
    select pr.output_snapshot
    from private.planner_runs pr
    join current_plan p on p.id = pr.plan_id and p.user_id = pr.user_id
    where pr.status = 'completed'
    order by pr.finished_at desc nulls last, pr.created_at desc
    limit 1
  ),
  risks as (
    select
      (risk.value ->> 'activityId')::uuid as activity_id,
      risk.value as value
    from current_run r
    cross join lateral jsonb_array_elements(
      coalesce(r.output_snapshot -> 'activityRisks', '[]'::jsonb)
    ) risk
  ),
  scheduled_activity_ids as (
    select distinct s.activity_id
    from current_plan p
    join public.plan_items pi
      on pi.plan_id = p.id and pi.user_id = p.user_id
    join public.study_sessions s
      on s.id = pi.session_id and s.user_id = p.user_id
    where pi.change_kind <> 'removed'
  ),
  relevant_activity_ids as (
    select activity_id from scheduled_activity_ids
    union
    select activity_id from risks
  ),
  activity_projection as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'activityId', a.id,
          'title', a.title,
          'disciplineId', a.discipline_id,
          'deadlineAt', a.deadline_at,
          'status', a.status,
          'estimatedMinutes', a.estimated_minutes,
          'actualMinutes', a.actual_minutes,
          'progressPercent', least(100, floor(a.actual_minutes * 100.0 / a.estimated_minutes)::integer),
          'risk', risks.value
        ) order by a.deadline_at, a.id
      ),
      '[]'::jsonb
    ) as value
    from relevant_activity_ids rai
    join public.activities a
      on a.id = rai.activity_id and a.user_id = auth.uid()
    left join risks on risks.activity_id = a.id
  ),
  session_projection as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'sessionId', s.id,
          'activityId', s.activity_id,
          'startsAt', pi.planned_start_at,
          'endsAt', pi.planned_end_at,
          'plannedMinutes', pi.planned_minutes,
          'status', s.status,
          'isPinned', s.is_pinned,
          'source', s.source,
          'rationaleCode', pi.rationale_code
        ) order by pi.planned_start_at, s.id
      ),
      '[]'::jsonb
    ) as value
    from current_plan p
    join public.plan_items pi
      on pi.plan_id = p.id and pi.user_id = p.user_id
    join public.study_sessions s
      on s.id = pi.session_id and s.user_id = p.user_id
    where pi.change_kind <> 'removed'
  )
  select jsonb_build_object(
    'contractVersion', 1,
    'plan', jsonb_build_object(
      'planId', p.id,
      'version', p.version,
      'status', p.status,
      'feasibility', p.feasibility,
      'timezone', p.timezone,
      'horizonStartDate', p.horizon_start_date,
      'horizonEndDate', p.horizon_end_date,
      'plannerVersion', p.planner_version,
      'rulesVersion', p.rules_version,
      'publishedAt', p.published_at
    ),
    'capacity', case
      when r.output_snapshot -> 'capacity' is null then null
      else (r.output_snapshot -> 'capacity') || jsonb_build_object(
        'balanceMinutes',
        (r.output_snapshot #>> '{capacity,netMinutes}')::integer
          - (r.output_snapshot #>> '{capacity,allocatedMinutes}')::integer
      )
    end,
    'activities', ap.value,
    'sessions', sp.value
  )
  from current_plan p
  left join current_run r on true
  cross join activity_projection ap
  cross join session_projection sp;
$$;

revoke all on function public.read_current_plan() from public, anon;
grant execute on function public.read_current_plan() to authenticated;

comment on function public.read_current_plan() is
  'Retorna uma única projeção autenticada do plano publicado para todas as visões.';
