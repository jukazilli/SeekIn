begin;

set local search_path = extensions, public, pg_catalog;

create temporary table g1_probe (
  name text primary key,
  passed boolean not null
) on commit drop;

grant select, insert, update on table g1_probe to authenticated;

insert into auth.users (id)
values
  ('10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002');

insert into public.profiles (user_id)
values
  ('10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002');

insert into public.disciplines (id, user_id, name)
values (
  '20000000-0000-0000-0000-000000000020',
  '20000000-0000-0000-0000-000000000002',
  'Disciplina B'
);

insert into public.calendar_blocks (
  id,
  user_id,
  title,
  kind,
  starts_at,
  ends_at
)
values (
  '20000000-0000-0000-0000-000000000030',
  '20000000-0000-0000-0000-000000000002',
  'Bloqueio B',
  'one_off',
  '2026-09-14T15:00:00Z',
  '2026-09-14T16:00:00Z'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

insert into public.disciplines (id, user_id, name)
values (
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000001',
  'Disciplina A'
);

insert into g1_probe (name, passed)
select
  'own_visible',
  count(*) = 1
from public.disciplines
where id = '10000000-0000-0000-0000-000000000010';

insert into g1_probe (name, passed)
select
  'other_hidden',
  count(*) = 0
from public.disciplines
where id = '20000000-0000-0000-0000-000000000020';

do $$
begin
  begin
    insert into public.disciplines (id, user_id, name)
    values (
      '20000000-0000-0000-0000-000000000021',
      '20000000-0000-0000-0000-000000000002',
      'Inserção cruzada'
    );
    insert into g1_probe values ('cross_insert_denied', false);
  exception when insufficient_privilege then
    insert into g1_probe values ('cross_insert_denied', true);
  end;
end;
$$;

with changed as (
  update public.disciplines
  set name = 'Alteração cruzada'
  where id = '20000000-0000-0000-0000-000000000020'
  returning 1
)
insert into g1_probe (name, passed)
select 'cross_update_hidden', count(*) = 0 from changed;

with removed as (
  delete from public.calendar_blocks
  where id = '20000000-0000-0000-0000-000000000030'
  returning 1
)
insert into g1_probe (name, passed)
select 'cross_delete_hidden', count(*) = 0 from removed;

do $$
begin
  begin
    insert into public.activities (
      id,
      user_id,
      discipline_id,
      title,
      activity_type,
      deadline_local_date,
      deadline_timezone,
      deadline_at,
      deadline_has_time,
      estimated_minutes
    )
    values (
      '10000000-0000-0000-0000-000000000040',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000020',
      'Atividade inválida',
      'reading',
      '2026-09-18',
      'America/Sao_Paulo',
      '2026-09-19T02:59:00Z',
      false,
      50
    );
    insert into g1_probe values ('cross_fk_rejected', false);
  exception when foreign_key_violation then
    insert into g1_probe values ('cross_fk_rejected', true);
  end;
end;
$$;

insert into public.availability_windows (
  id,
  user_id,
  day_of_week,
  start_local,
  end_local,
  valid_from
)
values (
  '10000000-0000-0000-0000-000000000050',
  '10000000-0000-0000-0000-000000000001',
  1,
  '18:00',
  '20:00',
  '2026-09-14'
);

do $$
begin
  begin
    insert into public.availability_windows (
      id,
      user_id,
      day_of_week,
      start_local,
      end_local,
      valid_from
    )
    values (
      '10000000-0000-0000-0000-000000000051',
      '10000000-0000-0000-0000-000000000001',
      1,
      '19:00',
      '21:00',
      '2026-09-14'
    );
    insert into g1_probe values ('overlap_rejected', false);
  exception when exclusion_violation then
    insert into g1_probe values ('overlap_rejected', true);
  end;
end;
$$;

with changed as (
  update public.disciplines
  set description = 'Revisão controlada'
  where id = '10000000-0000-0000-0000-000000000010'
  returning revision
)
insert into g1_probe (name, passed)
select 'revision_bumped', revision = 2 from changed;

reset role;

delete from auth.users
where id in (
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002'
);

select tap_line
from (
  values
    (plan(37)),
    (has_schema('private', 'schema private existe')),
    (has_table('public', 'availability_windows', 'availability_windows existe')),
    (has_table('public', 'calendar_blocks', 'calendar_blocks existe')),
    (has_table('public', 'disciplines', 'disciplines existe')),
    (has_table('public', 'activities', 'activities existe')),
    (has_table('public', 'activity_links', 'activity_links existe')),
    (has_table('public', 'plans', 'plans existe')),
    (has_table('public', 'study_sessions', 'study_sessions existe')),
    (has_table('public', 'plan_items', 'plan_items existe')),
    (has_table('public', 'session_executions', 'session_executions existe')),
    (has_table('public', 'plan_conflicts', 'plan_conflicts existe')),
    (has_table('public', 'plan_conflict_activities', 'plan_conflict_activities existe')),
    (has_table('public', 'alerts', 'alerts existe')),
    (has_table('private', 'idempotency_keys', 'idempotency_keys existe')),
    (has_table('private', 'planner_runs', 'planner_runs existe')),
    (has_table('private', 'audit_events', 'audit_events existe')),
    (
      is(
        (
          select count(*)::integer
          from pg_class
          where oid in (
            'public.profiles'::regclass,
            'public.user_preferences'::regclass,
            'public.availability_windows'::regclass,
            'public.calendar_blocks'::regclass,
            'public.disciplines'::regclass,
            'public.activities'::regclass,
            'public.activity_links'::regclass,
            'public.plans'::regclass,
            'public.study_sessions'::regclass,
            'public.plan_items'::regclass,
            'public.session_executions'::regclass,
            'public.plan_conflicts'::regclass,
            'public.plan_conflict_activities'::regclass,
            'public.alerts'::regclass
          ) and relrowsecurity
        ),
        14,
        'todas as tabelas públicas P0 possuem RLS'
      )
    ),
    (
      is(
        (
          select count(*)::integer
          from information_schema.role_table_grants
          where table_schema = 'public' and grantee = 'anon'
        ),
        0,
        'anon não possui grants nas tabelas P0'
      )
    ),
    (
      is(
        (
          select count(*)::integer
          from information_schema.role_table_grants
          where table_schema = 'public' and grantee = 'authenticated'
        ),
        31,
        'authenticated possui somente a matriz explícita de grants'
      )
    ),
    (
      is(
        (select count(*)::integer from pg_policies where schemaname = 'public'),
        31,
        'policies existem somente para as operações declaradas'
      )
    ),
    (
      is(
        (
          select count(*)::integer
          from information_schema.role_table_grants
          where table_schema = 'private' and grantee in ('anon', 'authenticated')
        ),
        0,
        'schema private não concede tabelas aos papéis da Data API'
      )
    ),
    (
      is(
        (
          select count(*)::integer
          from information_schema.role_table_grants
          where table_schema = 'public'
            and table_name in ('profiles', 'user_preferences')
            and grantee = 'authenticated'
            and privilege_type = 'DELETE'
        ),
        0,
        'perfil e preferências não permitem exclusão direta'
      )
    ),
    (
      ok(
        to_regclass('public.plans_one_published_per_user') is not null,
        'índice impede dois planos publicados por usuário'
      )
    ),
    (
      ok(
        to_regclass('public.session_executions_one_running_per_user') is not null,
        'índice impede duas execuções simultâneas por usuário'
      )
    ),
    (
      is(
        (
          select count(*)::integer
          from pg_constraint
          where conname = 'availability_windows_no_active_overlap' and contype = 'x'
        ),
        1,
        'constraint de exclusão protege disponibilidade ativa'
      )
    ),
    (
      is(
        (
          select count(*)::integer
          from pg_trigger
          where not tgisinternal and tgname like '%_bump_revision'
        ),
        10,
        'entidades mutáveis incrementam revision pelo banco'
      )
    ),
    (
      is(
        (
          select count(*)::integer
          from pg_constraint
          where conname like '%_owner_fk' and contype = 'f'
        ),
        11,
        'FKs compostas impedem associação entre contas'
      )
    ),
    (
      ok(
        has_function_privilege('authenticated', 'public.foundation_health()', 'EXECUTE'),
        'authenticated executa o health do banco'
      )
    ),
    (
      ok(
        has_function_privilege('anon', 'public.foundation_health()', 'EXECUTE') = false,
        'anon não executa o health protegido'
      )
    ),
    (ok((select passed from g1_probe where name = 'own_visible'), 'usuário lê o próprio registro')),
    (ok((select passed from g1_probe where name = 'other_hidden'), 'usuário A não lê registro do usuário B')),
    (ok((select passed from g1_probe where name = 'cross_insert_denied'), 'usuário A não insere para o usuário B')),
    (ok((select passed from g1_probe where name = 'cross_update_hidden'), 'usuário A não altera registro do usuário B')),
    (ok((select passed from g1_probe where name = 'cross_delete_hidden'), 'usuário A não exclui registro do usuário B')),
    (ok((select passed from g1_probe where name = 'cross_fk_rejected'), 'FK composta rejeita associação entre contas')),
    (ok((select passed from g1_probe where name = 'overlap_rejected'), 'sobreposição de disponibilidade ativa é rejeitada')),
    (ok((select passed from g1_probe where name = 'revision_bumped'), 'revision é incrementada automaticamente'))
) as checks(tap_line)
union all
select * from finish();

rollback;
