begin;

set local search_path = extensions, public, pg_catalog;

select plan(12);

insert into auth.users (id) values ('40000000-0000-0000-0000-000000000001');
insert into public.profiles (user_id) values ('40000000-0000-0000-0000-000000000001');
insert into public.activities (
  id, user_id, title, activity_type, deadline_local_date, deadline_timezone,
  deadline_at, deadline_has_time, estimated_minutes
) values (
  '40000000-0000-4000-8000-000000000021',
  '40000000-0000-0000-0000-000000000001',
  'Atividade sintética', 'reading', '2026-09-19', 'America/Sao_Paulo',
  '2026-09-19T02:59:00Z', false, 50
);

create temporary table idempotent_results (attempt text, payload jsonb) on commit drop;
grant select, insert on table idempotent_results to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);

insert into idempotent_results values (
  'original',
  public.persist_idempotent_plan_proposal(
    'manual_request', null,
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","horizonStartDate":"2026-09-14","horizonEndDate":"2026-09-20","timezone":"America/Sao_Paulo","activities":[]}'::jsonb,
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","feasibility":"feasible","requiresConfirmation":true,"sessions":[{"sessionId":"40000000-0000-4000-8000-000000000041","activityId":"40000000-0000-4000-8000-000000000021","startsAt":"2026-09-14T21:00:00Z","endsAt":"2026-09-14T21:50:00Z","plannedMinutes":50,"changeKind":"created","rationaleCode":"earliest_deadline"}],"conflicts":[],"inputHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","outputHash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}'::jsonb,
    'skn-092-original', repeat('1', 64), repeat('2', 64)
  )
);

insert into idempotent_results values (
  'replay',
  public.persist_idempotent_plan_proposal(
    'manual_request', null,
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","horizonStartDate":"2026-09-14","horizonEndDate":"2026-09-20","timezone":"America/Sao_Paulo","activities":[]}'::jsonb,
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","feasibility":"partial","requiresConfirmation":true,"sessions":[],"conflicts":[],"inputHash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","outputHash":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"}'::jsonb,
    'skn-092-replay', repeat('1', 64), repeat('2', 64)
  )
);

select is((select payload ->> 'replayed' from idempotent_results where attempt = 'original'), 'false', 'primeira chamada não é replay');
select is((select payload ->> 'replayed' from idempotent_results where attempt = 'replay'), 'true', 'retry é identificado como replay');
select is(
  (select payload #>> '{proposal,planId}' from idempotent_results where attempt = 'original'),
  (select payload #>> '{proposal,planId}' from idempotent_results where attempt = 'replay'),
  'retry devolve o mesmo plano'
);
select is(
  (select payload #>> '{output,outputHash}' from idempotent_results where attempt = 'replay'),
  repeat('b', 64),
  'retry devolve a saída original, não o cálculo atrasado'
);

select throws_ok(
  $$select public.persist_idempotent_plan_proposal(
    'manual_request', null,
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","horizonStartDate":"2026-09-14","horizonEndDate":"2026-09-20","timezone":"America/Sao_Paulo","activities":[]}'::jsonb,
    '{"contractVersion":1,"plannerVersion":"planner-core-v1","rulesVersion":"planner-rules-v1","feasibility":"feasible","requiresConfirmation":true,"sessions":[],"conflicts":[],"inputHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","outputHash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}'::jsonb,
    'skn-092-conflict', repeat('1', 64), repeat('3', 64)
  )$$,
  'P0001', 'IDEMPOTENCY_CONFLICT', 'mesma chave com outro corpo gera conflito'
);

reset role;

select is((select count(*)::integer from public.plans where user_id = '40000000-0000-0000-0000-000000000001'), 1, 'retry não duplica plano');
select is((select count(*)::integer from public.plan_items where user_id = '40000000-0000-0000-0000-000000000001'), 1, 'retry não duplica item');
select is((select count(*)::integer from private.planner_runs where user_id = '40000000-0000-0000-0000-000000000001'), 1, 'retry não duplica execução');
select is((select count(*)::integer from private.audit_events where user_id = '40000000-0000-0000-0000-000000000001'), 1, 'retry não duplica auditoria');
select is((select status from private.idempotency_keys where user_id = '40000000-0000-0000-0000-000000000001'), 'completed', 'chave termina completa');
select ok((select expires_at > created_at from private.idempotency_keys where user_id = '40000000-0000-0000-0000-000000000001'), 'chave possui expiração futura');
select ok(
  not has_function_privilege('authenticated', 'public.persist_plan_proposal(text, uuid, jsonb, jsonb, text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.persist_idempotent_plan_proposal(text, uuid, jsonb, jsonb, text, text, text)', 'EXECUTE'),
  'authenticated só executa a fronteira idempotente'
);

select * from finish();
rollback;
