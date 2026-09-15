begin;

set local search_path = extensions, public, pg_catalog;

select plan(12);

insert into auth.users (id)
values
  ('95000000-0000-4000-8000-000000000001'),
  ('95000000-0000-4000-8000-000000000002');

insert into public.profiles (user_id)
values
  ('95000000-0000-4000-8000-000000000001'),
  ('95000000-0000-4000-8000-000000000002');

insert into public.activities (
  id, user_id, title, activity_type, deadline_local_date, deadline_timezone,
  deadline_at, deadline_has_time, estimated_minutes, actual_minutes, status
)
values
  (
    '95000000-0000-4000-8000-000000000021',
    '95000000-0000-4000-8000-000000000001',
    'Atividade sintética A', 'reading', '2026-09-20', 'America/Sao_Paulo',
    '2026-09-20T02:59:00Z', false, 100, 25, 'in_progress'
  ),
  (
    '95000000-0000-4000-8000-000000000022',
    '95000000-0000-4000-8000-000000000002',
    'Atividade sintética B', 'reading', '2026-09-20', 'America/Sao_Paulo',
    '2026-09-20T02:59:00Z', false, 50, 0, 'active'
  );

insert into public.plans (
  id, user_id, version, status, feasibility, generation_reason,
  horizon_start_date, horizon_end_date, timezone, planner_version,
  rules_version, input_hash, output_hash, published_at
)
values
  (
    '95000000-0000-4000-8000-000000000031',
    '95000000-0000-4000-8000-000000000001',
    1, 'published', 'feasible', 'manual_request', '2026-09-15', '2026-09-21',
    'America/Sao_Paulo', 'planner-core-v1', 'planner-rules-v1', repeat('a', 64),
    repeat('b', 64), '2026-09-15T12:00:00Z'
  ),
  (
    '95000000-0000-4000-8000-000000000032',
    '95000000-0000-4000-8000-000000000001',
    2, 'proposal', 'feasible', 'manual_request', '2026-09-15', '2026-09-21',
    'America/Sao_Paulo', 'planner-core-v1', 'planner-rules-v1', repeat('c', 64),
    repeat('d', 64), null
  ),
  (
    '95000000-0000-4000-8000-000000000033',
    '95000000-0000-4000-8000-000000000002',
    1, 'published', 'feasible', 'manual_request', '2026-09-15', '2026-09-21',
    'America/Sao_Paulo', 'planner-core-v1', 'planner-rules-v1', repeat('e', 64),
    repeat('f', 64), '2026-09-15T12:00:00Z'
  );

insert into public.study_sessions (id, user_id, activity_id, source, created_by_plan_id)
values
  (
    '95000000-0000-4000-8000-000000000041',
    '95000000-0000-4000-8000-000000000001',
    '95000000-0000-4000-8000-000000000021', 'automatic',
    '95000000-0000-4000-8000-000000000031'
  ),
  (
    '95000000-0000-4000-8000-000000000042',
    '95000000-0000-4000-8000-000000000002',
    '95000000-0000-4000-8000-000000000022', 'automatic',
    '95000000-0000-4000-8000-000000000033'
  );

insert into public.plan_items (
  user_id, plan_id, session_id, planned_start_at, planned_end_at,
  planned_minutes, change_kind, rationale_code
)
values
  (
    '95000000-0000-4000-8000-000000000001',
    '95000000-0000-4000-8000-000000000031',
    '95000000-0000-4000-8000-000000000041',
    '2026-09-16T21:00:00Z', '2026-09-16T21:50:00Z', 50, 'created',
    'earliest_deadline'
  ),
  (
    '95000000-0000-4000-8000-000000000002',
    '95000000-0000-4000-8000-000000000033',
    '95000000-0000-4000-8000-000000000042',
    '2026-09-17T21:00:00Z', '2026-09-17T21:50:00Z', 50, 'created',
    'earliest_deadline'
  );

insert into private.planner_runs (
  user_id, plan_id, contract_version, rules_version, status, started_at,
  finished_at, duration_ms, input_snapshot, output_snapshot
)
values
  (
    '95000000-0000-4000-8000-000000000001',
    '95000000-0000-4000-8000-000000000031', '1', 'planner-rules-v1',
    'completed', '2026-09-15T11:59:59Z', '2026-09-15T12:00:00Z', 1000,
    '{}'::jsonb,
    '{
      "capacity": {
        "grossMinutes": 600, "operationalMinutes": 500,
        "netMinutes": 400, "allocatedMinutes": 150
      },
      "activityRisks": [{
        "activityId": "95000000-0000-4000-8000-000000000021",
        "level": "attention", "slackMinutes": 250, "loadRate": 0.5
      }]
    }'::jsonb
  );

select is(public.read_current_plan(), null, 'sem autenticação não há plano');
select ok(
  not has_function_privilege('anon', 'public.read_current_plan()', 'EXECUTE'),
  'anon não executa a leitura'
);
select ok(
  has_function_privilege('authenticated', 'public.read_current_plan()', 'EXECUTE'),
  'authenticated executa a leitura'
);

create temporary table current_projection (payload jsonb) on commit drop;
grant select, insert on table current_projection to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-000000000001', true);
insert into current_projection select public.read_current_plan();
reset role;

select is(payload #>> '{plan,planId}', '95000000-0000-4000-8000-000000000031', 'usa somente o published') from current_projection;
select is((payload #>> '{plan,version}')::integer, 1, 'expõe uma única versão') from current_projection;
select is((payload #>> '{capacity,balanceMinutes}')::integer, 250, 'reconcilia saldo de capacidade') from current_projection;
select is(jsonb_array_length(payload -> 'sessions'), 1, 'expõe somente sessões do vigente') from current_projection;
select is(payload #>> '{sessions,0,status}', 'scheduled', 'estado da sessão vem da entidade canônica') from current_projection;
select is(payload #>> '{sessions,0,startsAt}', '2026-09-16T21:00:00+00:00', 'horário vem do item versionado') from current_projection;
select is((payload #>> '{activities,0,progressPercent}')::integer, 25, 'progresso é reconciliado') from current_projection;
select is(payload #>> '{activities,0,risk,level}', 'attention', 'risco vem do snapshot da mesma versão') from current_projection;
select ok(payload::text !~ 'Atividade sintética B', 'não vaza conteúdo de outra conta') from current_projection;

select * from finish();
rollback;
