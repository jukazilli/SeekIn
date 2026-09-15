begin;

set local search_path = extensions, public, pg_catalog;

select plan(15);

-- O teste histórico do SKN-091 exercita a primitiva interna diretamente.
-- A migration do SKN-092 revoga este grant fora desta transação de teste.
grant execute on function public.persist_plan_proposal(text, uuid, jsonb, jsonb, text)
to authenticated;

insert into auth.users (id)
values ('30000000-0000-0000-0000-000000000001');

insert into public.profiles (user_id)
values ('30000000-0000-0000-0000-000000000001');

insert into public.activities (
  id,
  user_id,
  title,
  activity_type,
  deadline_local_date,
  deadline_timezone,
  deadline_at,
  deadline_has_time,
  estimated_minutes
)
values (
  '30000000-0000-4000-8000-000000000021',
  '30000000-0000-0000-0000-000000000001',
  'Atividade sintética',
  'reading',
  '2026-09-19',
  'America/Sao_Paulo',
  '2026-09-19T02:59:00Z',
  false,
  50
);

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
  published_at
)
values (
  '30000000-0000-4000-8000-000000000031',
  '30000000-0000-0000-0000-000000000001',
  1,
  'published',
  'feasible',
  'onboarding_completed',
  '2026-09-07',
  '2026-09-13',
  'America/Sao_Paulo',
  'planner-core-v1',
  'planner-rules-v1',
  repeat('a', 64),
  repeat('b', 64),
  '2026-09-07T12:00:00Z'
);

create temporary table proposal_result (payload jsonb) on commit drop;
grant select, insert on table proposal_result to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);

insert into proposal_result (payload)
select public.persist_plan_proposal(
  'manual_request',
  '30000000-0000-4000-8000-000000000031',
  '{
    "contractVersion": 1,
    "plannerVersion": "planner-core-v1",
    "rulesVersion": "planner-rules-v1",
    "horizonStartDate": "2026-09-14",
    "horizonEndDate": "2026-09-20",
    "timezone": "America/Sao_Paulo",
    "activities": []
  }'::jsonb,
  '{
    "contractVersion": 1,
    "plannerVersion": "planner-core-v1",
    "rulesVersion": "planner-rules-v1",
    "feasibility": "feasible",
    "requiresConfirmation": true,
    "sessions": [{
      "sessionId": "30000000-0000-4000-8000-000000000041",
      "activityId": "30000000-0000-4000-8000-000000000021",
      "startsAt": "2026-09-14T21:00:00Z",
      "endsAt": "2026-09-14T21:50:00Z",
      "plannedMinutes": 50,
      "changeKind": "created",
      "rationaleCode": "earliest_deadline"
    }],
    "conflicts": [],
    "inputHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "outputHash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  }'::jsonb,
  'skn-091-success'
);

select is(payload ->> 'status', 'proposal', 'retorna status proposal')
from proposal_result;
select is((payload ->> 'version')::integer, 2, 'atribui versão sequencial')
from proposal_result;

reset role;

select is(
  (select count(*)::integer from public.plans where user_id = '30000000-0000-0000-0000-000000000001'),
  2,
  'cria exatamente uma proposta'
);
select is(
  (select count(*)::integer from public.plans where status = 'published' and user_id = '30000000-0000-0000-0000-000000000001'),
  1,
  'preserva o plano publicado'
);
select is(
  (select count(*)::integer from public.study_sessions where user_id = '30000000-0000-0000-0000-000000000001'),
  1,
  'persiste sessão automática'
);
select is(
  (select count(*)::integer from public.plan_items where user_id = '30000000-0000-0000-0000-000000000001'),
  1,
  'persiste posição versionada da sessão'
);
select is(
  (select count(*)::integer from private.planner_runs where user_id = '30000000-0000-0000-0000-000000000001' and status = 'completed'),
  1,
  'registra execução reproduzível'
);
select is(
  (select count(*)::integer from private.audit_events where correlation_id = 'skn-091-success'),
  1,
  'registra auditoria correlacionada'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-0000-0000-000000000001',
  true
);

select throws_ok(
  $$select public.persist_plan_proposal(
    'manual_request',
    null,
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","horizonStartDate":"2026-09-14","horizonEndDate":"2026-09-20","timezone":"America/Sao_Paulo","activities":[]}'::jsonb,
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","feasibility":"feasible","requiresConfirmation":true,"sessions":[],"conflicts":[],"inputHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","outputHash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}'::jsonb,
    'skn-091-stale'
  )$$,
  'P0001',
  'STALE_PLAN',
  'rejeita plano vigente divergente'
);

select throws_ok(
  $$select public.persist_plan_proposal(
    'manual_request',
    '30000000-0000-4000-8000-000000000031',
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","horizonStartDate":"2026-09-14","horizonEndDate":"2026-09-20","timezone":"America/Sao_Paulo","activities":[]}'::jsonb,
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","feasibility":"feasible","requiresConfirmation":true,"sessions":[{"sessionId":"30000000-0000-4000-8000-000000000099","activityId":"30000000-0000-4000-8000-000000000098","startsAt":"2026-09-14T21:00:00Z","endsAt":"2026-09-14T21:50:00Z","plannedMinutes":50,"changeKind":"created","rationaleCode":"earliest_deadline"}],"conflicts":[],"inputHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","outputHash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}'::jsonb,
    'skn-091-failure'
  )$$,
  '23503',
  null,
  'propaga falha de FK durante a transação'
);

reset role;

select ok(
  has_function_privilege(
    'authenticated',
    'public.persist_plan_proposal(text, uuid, jsonb, jsonb, text)',
    'EXECUTE'
  ),
  'authenticated pode executar apenas a RPC controlada'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.persist_plan_proposal(text, uuid, jsonb, jsonb, text)',
    'EXECUTE'
  ),
  'anon não pode executar a RPC'
);

select is(
  (select count(*)::integer from public.plans where user_id = '30000000-0000-0000-0000-000000000001'),
  2,
  'rollback não deixa plano parcial'
);
select is(
  (select max(version) from public.plans where user_id = '30000000-0000-0000-0000-000000000001'),
  2,
  'falhas não consomem versão'
);
select is(
  (select count(*)::integer from public.plans where status = 'published' and user_id = '30000000-0000-0000-0000-000000000001'),
  1,
  'falhas mantêm o plano vigente'
);

select * from finish();
rollback;
