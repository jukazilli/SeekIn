begin;

set local search_path = extensions, public, pg_catalog;

select tap_line
from (
  values
    (plan(11)),
    (has_table('public', 'profiles', 'profiles existe')),
    (has_table('public', 'user_preferences', 'user_preferences existe')),
    (has_function('public', 'foundation_health', array[]::text[], 'health existe')),
    (
      ok(
        (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
        'profiles possui RLS'
      )
    ),
    (
      ok(
        (select relrowsecurity from pg_class where oid = 'public.user_preferences'::regclass),
        'user_preferences possui RLS'
      )
    ),
    (
      is(
        (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'profiles'),
        3,
        'profiles permite apenas select, insert e update'
      )
    ),
    (
      is(
        (
          select count(*)::integer
          from pg_policies
          where schemaname = 'public' and tablename = 'user_preferences'
        ),
        3,
        'user_preferences permite apenas select, insert e update'
      )
    ),
    (
      is(
        (
          select count(*)::integer
          from information_schema.role_table_grants
          where table_schema = 'public'
            and table_name in ('profiles', 'user_preferences')
            and grantee = 'anon'
        ),
        0,
        'anon não possui privilégios nas tabelas privadas'
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
        'authenticated não exclui perfil ou preferências diretamente'
      )
    ),
    (
      ok(
        has_schema_privilege('authenticated', 'private', 'USAGE') = false,
        'authenticated não acessa o schema private'
      )
    ),
    (is(public.foundation_health(), 1, 'health não consulta dados de aluno'))
) as checks(tap_line)
union all
select * from finish();

rollback;

