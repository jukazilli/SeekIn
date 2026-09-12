begin;

select plan(9);

select has_table('public', 'profiles', 'profiles existe');
select has_table('public', 'user_preferences', 'user_preferences existe');
select has_function('public', 'foundation_health', array[]::text[], 'health existe');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles possui RLS'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_preferences'::regclass),
  'user_preferences possui RLS'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'profiles'),
  4,
  'profiles possui uma policy por operação'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'user_preferences'),
  4,
  'user_preferences possui uma policy por operação'
);

select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('profiles', 'user_preferences')
      and grantee = 'anon'
  ),
  0,
  'anon não possui privilégios nas tabelas privadas'
);

select is(
  (select public.foundation_health()),
  1,
  'health não consulta dados de aluno'
);

select * from finish();

rollback;

