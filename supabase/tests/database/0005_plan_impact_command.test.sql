begin;

set local search_path = extensions, public, pg_catalog;
select plan(10);

insert into auth.users (id) values ('50000000-0000-0000-0000-000000000001');
insert into public.profiles (user_id) values ('50000000-0000-0000-0000-000000000001');
insert into public.activities (
  id, user_id, title, activity_type, deadline_local_date, deadline_timezone,
  deadline_at, deadline_has_time, estimated_minutes
) values (
  '50000000-0000-4000-8000-000000000021',
  '50000000-0000-0000-0000-000000000001',
  'Atividade sintética', 'reading', '2026-09-19', 'America/Sao_Paulo',
  '2026-09-19T02:59:00Z', false, 50
);
insert into public.plans (
  id, user_id, version, status, feasibility, generation_reason,
  horizon_start_date, horizon_end_date, timezone, planner_version,
  rules_version, input_hash, output_hash, published_at
) values (
  '50000000-0000-4000-8000-000000000031',
  '50000000-0000-0000-0000-000000000001', 1, 'published', 'feasible',
  'onboarding_completed', '2026-09-14', '2026-09-20', 'America/Sao_Paulo',
  'planner-core-v1', 'planner-rules-v1', repeat('a', 64), repeat('b', 64), now()
);
insert into public.study_sessions (id, user_id, activity_id, source, created_by_plan_id)
values (
  '50000000-0000-4000-8000-000000000041',
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-4000-8000-000000000021', 'automatic',
  '50000000-0000-4000-8000-000000000031'
);
insert into public.plan_items (
  user_id, plan_id, session_id, planned_start_at, planned_end_at,
  planned_minutes, change_kind, rationale_code
) values (
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-4000-8000-000000000031',
  '50000000-0000-4000-8000-000000000041',
  '2026-09-14T21:00:00Z', '2026-09-14T21:50:00Z', 50, 'created',
  'earliest_deadline'
);

create temporary table impact_results (attempt text, payload jsonb) on commit drop;
grant select, insert on table impact_results to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);

insert into impact_results values (
  'original',
  public.persist_idempotent_plan_impact(
    'activity_changed', '50000000-0000-4000-8000-000000000031',
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","horizonStartDate":"2026-09-14","horizonEndDate":"2026-09-20","timezone":"America/Sao_Paulo","activities":[]}'::jsonb,
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","feasibility":"feasible","requiresConfirmation":true,"capacity":{"grossMinutes":50,"operationalMinutes":50,"netMinutes":50,"allocatedMinutes":50},"sessions":[{"sessionId":"50000000-0000-4000-8000-000000000041","activityId":"50000000-0000-4000-8000-000000000021","startsAt":"2026-09-15T21:00:00Z","endsAt":"2026-09-15T21:50:00Z","plannedMinutes":50,"changeKind":"moved","rationaleCode":"earliest_deadline"}],"activityRisks":[],"unallocated":[],"conflicts":[],"changes":{"created":0,"kept":0,"moved":1,"removed":0},"inputHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","outputHash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}'::jsonb,
    'skn-093-impact', repeat('4', 64), repeat('5', 64)
  )
);
insert into impact_results values (
  'replay',
  public.persist_idempotent_plan_impact(
    'activity_changed', '50000000-0000-4000-8000-000000000031',
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","horizonStartDate":"2026-09-14","horizonEndDate":"2026-09-20","timezone":"America/Sao_Paulo","activities":[]}'::jsonb,
    '{}'::jsonb, 'skn-093-replay', repeat('4', 64), repeat('5', 64)
  )
);

select is((select payload #>> '{proposal,status}' from impact_results where attempt = 'original'), 'proposal', 'impacto cria somente proposta');
select is((select payload #>> '{output,changes,moved}' from impact_results where attempt = 'original'), '1', 'resposta preserva diff movido');
select is((select payload ->> 'replayed' from impact_results where attempt = 'replay'), 'true', 'retry reproduz impacto');
reset role;

select is((select count(*)::integer from public.plans where user_id = '50000000-0000-0000-0000-000000000001' and status = 'published'), 1, 'plano vigente permanece publicado');
select is((select planned_start_at::text from public.plan_items where plan_id = '50000000-0000-4000-8000-000000000031'), '2026-09-14 21:00:00+00', 'item vigente não é alterado');
select is((select count(*)::integer from public.plans where user_id = '50000000-0000-0000-0000-000000000001'), 2, 'retry não duplica proposta');
select is((select count(*)::integer from private.planner_runs where user_id = '50000000-0000-0000-0000-000000000001'), 1, 'retry não duplica execução');
select is((select scope from private.idempotency_keys where user_id = '50000000-0000-0000-0000-000000000001'), 'planner.impact', 'chave usa escopo de impacto');
select is((select action from private.audit_events where user_id = '50000000-0000-0000-0000-000000000001'), 'plan.proposal_created', 'impacto mantém auditoria de proposta');
select ok(has_function_privilege('authenticated', 'public.persist_idempotent_plan_impact(text, uuid, jsonb, jsonb, text, text, text)', 'EXECUTE'), 'authenticated executa a fronteira controlada');

select * from finish();
rollback;
