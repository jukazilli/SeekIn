create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'America/Sao_Paulo',
  onboarding_status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (display_name is null or char_length(trim(display_name)) between 1 and 80),
  constraint profiles_timezone_not_blank
    check (char_length(trim(timezone)) > 0),
  constraint profiles_onboarding_status_valid
    check (onboarding_status in ('not_started', 'in_progress', 'completed'))
);

comment on table public.profiles is
  'Perfil privado pertencente ao usuário autenticado; não representa ainda o futuro perfil social.';

create table public.user_preferences (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  week_starts_on smallint not null default 1,
  preferred_session_minutes smallint not null default 50,
  minimum_session_minutes smallint not null default 25,
  capacity_reserve_percent smallint not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_week_starts_on_valid
    check (week_starts_on between 0 and 6),
  constraint user_preferences_session_minutes_valid
    check (
      minimum_session_minutes between 5 and 240
      and preferred_session_minutes between minimum_session_minutes and 240
    ),
  constraint user_preferences_capacity_reserve_valid
    check (capacity_reserve_percent between 0 and 50)
);

comment on table public.user_preferences is
  'Preferências iniciais versionáveis; valores do planner continuam sujeitos às decisões de produto.';

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_preferences from anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_preferences_select_own"
on public.user_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_preferences_insert_own"
on public.user_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_preferences_update_own"
on public.user_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "user_preferences_delete_own"
on public.user_preferences
for delete
to authenticated
using ((select auth.uid()) = user_id);

create function public.foundation_health()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select 1;
$$;

comment on function public.foundation_health() is
  'Readiness mínimo sem acesso a dados do usuário.';

revoke all on function public.foundation_health() from public, anon;
grant execute on function public.foundation_health() to authenticated;
