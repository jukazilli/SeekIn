begin;

set local search_path = extensions, public, pg_catalog;

select plan(18);

insert into auth.users (id)
values
  ('96000000-0000-4000-8000-000000000001'),
  ('96000000-0000-4000-8000-000000000002'),
  ('96000000-0000-4000-8000-000000000003');

insert into public.profiles (user_id)
values
  ('96000000-0000-4000-8000-000000000001'),
  ('96000000-0000-4000-8000-000000000002'),
  ('96000000-0000-4000-8000-000000000003');

insert into public.plans (
  id, user_id, version, status, feasibility, generation_reason,
  horizon_start_date, horizon_end_date, timezone, planner_version,
  rules_version, input_hash, output_hash, published_at
)
values
  ('96000000-0000-4000-8000-000000000031', '96000000-0000-4000-8000-000000000001', 1, 'published', 'feasible', 'manual_request', '2026-09-15', '2026-09-21', 'America/Sao_Paulo', 'planner-core-v1', 'planner-rules-v1', repeat('a', 64), repeat('b', 64), '2026-09-15T12:00:00Z'),
  ('96000000-0000-4000-8000-000000000032', '96000000-0000-4000-8000-000000000001', 2, 'proposal', 'feasible', 'manual_request', '2026-09-15', '2026-09-21', 'America/Sao_Paulo', 'planner-core-v1', 'planner-rules-v1', repeat('c', 64), repeat('d', 64), null),
  ('96000000-0000-4000-8000-000000000033', '96000000-0000-4000-8000-000000000001', 3, 'proposal', 'feasible', 'manual_request', '2026-09-15', '2026-09-21', 'America/Sao_Paulo', 'planner-core-v1', 'planner-rules-v1', repeat('e', 64), repeat('f', 64), null),
  ('96000000-0000-4000-8000-000000000041', '96000000-0000-4000-8000-000000000002', 1, 'published', 'feasible', 'manual_request', '2026-09-15', '2026-09-21', 'America/Sao_Paulo', 'planner-core-v1', 'planner-rules-v1', repeat('1', 64), repeat('2', 64), '2026-09-15T12:00:00Z'),
  ('96000000-0000-4000-8000-000000000042', '96000000-0000-4000-8000-000000000002', 2, 'proposal', 'partial', 'manual_request', '2026-09-15', '2026-09-21', 'America/Sao_Paulo', 'planner-core-v1', 'planner-rules-v1', repeat('3', 64), repeat('4', 64), null),
  ('96000000-0000-4000-8000-000000000051', '96000000-0000-4000-8000-000000000003', 1, 'proposal', 'feasible', 'onboarding_completed', '2026-09-15', '2026-09-21', 'America/Sao_Paulo', 'planner-core-v1', 'planner-rules-v1', repeat('5', 64), repeat('6', 64), null);

create temporary table resolution_results (
  attempt text primary key,
  payload jsonb
) on commit drop;
grant select, insert on table resolution_results to authenticated;

select ok(
  not has_function_privilege('anon', 'public.resolve_plan_proposal(text, uuid, uuid, text, text, text)', 'EXECUTE'),
  'anon não resolve proposta'
);
select ok(
  has_function_privilege('authenticated', 'public.resolve_plan_proposal(text, uuid, uuid, text, text, text)', 'EXECUTE'),
  'authenticated executa a fronteira controlada'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000001', true);

insert into resolution_results
select 'confirm', public.resolve_plan_proposal(
  'confirm', '96000000-0000-4000-8000-000000000032',
  '96000000-0000-4000-8000-000000000031', 'skn-096-confirm',
  repeat('a', 64), repeat('b', 64)
);
insert into resolution_results
select 'confirm-replay', public.resolve_plan_proposal(
  'confirm', '96000000-0000-4000-8000-000000000032',
  '96000000-0000-4000-8000-000000000031', 'skn-096-confirm-replay',
  repeat('a', 64), repeat('b', 64)
);

select throws_ok(
  $$select public.resolve_plan_proposal('confirm', '96000000-0000-4000-8000-000000000033', '96000000-0000-4000-8000-000000000031', 'skn-096-stale', repeat('c', 64), repeat('d', 64))$$,
  'P0001', 'STALE_PLAN', 'plano-base obsoleto é rejeitado'
);
select throws_ok(
  $$select public.resolve_plan_proposal('confirm', '96000000-0000-4000-8000-000000000033', '96000000-0000-4000-8000-000000000032', 'skn-096-conflict', repeat('a', 64), repeat('e', 64))$$,
  'P0001', 'IDEMPOTENCY_CONFLICT', 'mesma chave com outro corpo conflita'
);
select throws_ok(
  $$select public.resolve_plan_proposal('confirm', '96000000-0000-4000-8000-000000000042', '96000000-0000-4000-8000-000000000032', 'skn-096-owner', repeat('c', 64), repeat('d', 64))$$,
  'P0001', 'RESOURCE_NOT_FOUND', 'proposta de outra conta não é revelada'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000002', true);
insert into resolution_results
select 'reject', public.resolve_plan_proposal(
  'reject', '96000000-0000-4000-8000-000000000042',
  '96000000-0000-4000-8000-000000000041', 'skn-096-reject',
  repeat('e', 64), repeat('f', 64)
);
insert into resolution_results
select 'reject-replay', public.resolve_plan_proposal(
  'reject', '96000000-0000-4000-8000-000000000042',
  '96000000-0000-4000-8000-000000000041', 'skn-096-reject-replay',
  repeat('e', 64), repeat('f', 64)
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-4000-8000-000000000003', true);
insert into resolution_results
select 'first-plan', public.resolve_plan_proposal(
  'confirm', '96000000-0000-4000-8000-000000000051', null,
  'skn-096-first', repeat('1', 64), repeat('2', 64)
);
reset role;

select is((select payload ->> 'status' from resolution_results where attempt = 'confirm'), 'published', 'confirmação publica proposta');
select is((select status from public.plans where id = '96000000-0000-4000-8000-000000000031'), 'superseded', 'confirmação substitui vigente anterior');
select ok((select confirmed_at is not null and published_at is not null from public.plans where id = '96000000-0000-4000-8000-000000000032'), 'confirmação registra instantes');
select is((select payload ->> 'replayed' from resolution_results where attempt = 'confirm-replay'), 'true', 'confirmação repetida reproduz resposta');
select is((select count(*)::integer from private.idempotency_keys where user_id = '96000000-0000-4000-8000-000000000001' and scope = 'planner.resolve'), 1, 'retry não duplica chave');
select is((select count(*)::integer from private.audit_events where user_id = '96000000-0000-4000-8000-000000000001' and action = 'plan.published'), 1, 'retry não duplica auditoria');
select is((select status from public.plans where id = '96000000-0000-4000-8000-000000000042'), 'rejected', 'cancelamento rejeita somente proposta');
select is((select status from public.plans where id = '96000000-0000-4000-8000-000000000041'), 'published', 'cancelamento mantém plano anterior');
select is((select payload ->> 'currentPlanId' from resolution_results where attempt = 'reject'), '96000000-0000-4000-8000-000000000041', 'cancelamento devolve vigente preservado');
select is((select payload ->> 'replayed' from resolution_results where attempt = 'reject-replay'), 'true', 'cancelamento repetido reproduz resposta');
select is((select status from public.plans where id = '96000000-0000-4000-8000-000000000051'), 'published', 'primeira geração publica sem plano anterior');
select is((select count(*)::integer from public.plans where user_id = '96000000-0000-4000-8000-000000000001' and status = 'published'), 1, 'permanece um único vigente');
select is((select count(*)::integer from public.plans where user_id = '96000000-0000-4000-8000-000000000002' and status = 'published'), 1, 'cancelamento não cria outro vigente');

select * from finish();
rollback;
