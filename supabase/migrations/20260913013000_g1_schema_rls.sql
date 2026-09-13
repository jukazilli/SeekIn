create extension if not exists btree_gist with schema extensions;
create extension if not exists pgtap with schema extensions;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create function private.bump_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  new.revision := old.revision + 1;
  return new;
end;
$$;

revoke all on function private.bump_revision() from public, anon, authenticated;

alter table public.profiles
  add column onboarding_step smallint not null default 0,
  add column onboarding_completed_at timestamptz,
  add column revision bigint not null default 1,
  add constraint profiles_onboarding_step_valid
    check (onboarding_step between 0 and 7),
  add constraint profiles_onboarding_completion_valid
    check (
      (onboarding_status = 'completed' and onboarding_completed_at is not null)
      or (onboarding_status <> 'completed' and onboarding_completed_at is null)
    ),
  add constraint profiles_revision_positive check (revision > 0);

alter table public.user_preferences
  add column revision bigint not null default 1,
  add constraint user_preferences_revision_positive check (revision > 0);

drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "user_preferences_delete_own" on public.user_preferences;
revoke delete on table public.profiles from authenticated;
revoke delete on table public.user_preferences from authenticated;

create trigger profiles_bump_revision
before update on public.profiles
for each row execute function private.bump_revision();

create trigger user_preferences_bump_revision
before update on public.user_preferences
for each row execute function private.bump_revision();

create table public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  day_of_week smallint not null,
  start_local time without time zone not null,
  end_local time without time zone not null,
  timezone text not null default 'America/Sao_Paulo',
  valid_from date not null,
  valid_until date,
  status text not null default 'active',
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_windows_owner_unique unique (user_id, id),
  constraint availability_windows_day_valid check (day_of_week between 0 and 6),
  constraint availability_windows_time_valid check (start_local < end_local),
  constraint availability_windows_timezone_not_blank check (char_length(trim(timezone)) > 0),
  constraint availability_windows_period_valid check (valid_until is null or valid_until >= valid_from),
  constraint availability_windows_status_valid check (status in ('active', 'archived')),
  constraint availability_windows_revision_positive check (revision > 0),
  constraint availability_windows_no_active_overlap exclude using gist (
    user_id with =,
    day_of_week with =,
    daterange(valid_from, coalesce(valid_until, 'infinity'::date), '[]') with &&,
    int4range(
      extract(epoch from start_local)::integer,
      extract(epoch from end_local)::integer,
      '[)'
    ) with &&
  ) where (status = 'active')
);

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  title text not null,
  kind text not null,
  source text not null default 'manual',
  day_of_week smallint,
  start_local time without time zone,
  end_local time without time zone,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'America/Sao_Paulo',
  valid_from date,
  valid_until date,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_blocks_owner_unique unique (user_id, id),
  constraint calendar_blocks_title_length check (char_length(trim(title)) between 1 and 120),
  constraint calendar_blocks_kind_valid check (kind in ('recurring', 'one_off')),
  constraint calendar_blocks_source_valid check (source in ('manual', 'imported')),
  constraint calendar_blocks_day_valid check (day_of_week is null or day_of_week between 0 and 6),
  constraint calendar_blocks_timezone_not_blank check (char_length(trim(timezone)) > 0),
  constraint calendar_blocks_revision_positive check (revision > 0),
  constraint calendar_blocks_shape_valid check (
    (
      kind = 'recurring'
      and day_of_week is not null
      and start_local is not null
      and end_local is not null
      and start_local < end_local
      and starts_at is null
      and ends_at is null
      and valid_from is not null
      and (valid_until is null or valid_until >= valid_from)
    )
    or
    (
      kind = 'one_off'
      and day_of_week is null
      and start_local is null
      and end_local is null
      and starts_at is not null
      and ends_at is not null
      and starts_at < ends_at
      and valid_from is null
      and valid_until is null
    )
  )
);

create table public.disciplines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  name text not null,
  description text,
  color_key text,
  status text not null default 'active',
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint disciplines_owner_unique unique (user_id, id),
  constraint disciplines_name_length check (char_length(trim(name)) between 1 and 120),
  constraint disciplines_description_length check (description is null or char_length(description) <= 1000),
  constraint disciplines_status_valid check (status in ('active', 'archived')),
  constraint disciplines_revision_positive check (revision > 0)
);

create unique index disciplines_active_name_unique
on public.disciplines (user_id, lower(name))
where status = 'active';

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  discipline_id uuid,
  title text not null,
  activity_type text not null,
  deadline_local_date date not null,
  deadline_local_time time without time zone,
  deadline_timezone text not null,
  deadline_at timestamptz not null,
  deadline_has_time boolean not null,
  estimated_minutes integer not null,
  actual_minutes integer not null default 0,
  priority smallint not null default 2,
  status text not null default 'active',
  notes_markdown text,
  source text not null default 'manual',
  source_external_id text,
  completed_at timestamptz,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_owner_unique unique (user_id, id),
  constraint activities_discipline_owner_fk foreign key (user_id, discipline_id)
    references public.disciplines (user_id, id),
  constraint activities_title_length check (char_length(trim(title)) between 1 and 200),
  constraint activities_type_valid check (
    activity_type in ('assignment', 'exam', 'reading', 'project', 'exercise', 'extension', 'other')
  ),
  constraint activities_deadline_timezone_not_blank check (char_length(trim(deadline_timezone)) > 0),
  constraint activities_deadline_shape_valid check (
    deadline_has_time = (deadline_local_time is not null)
  ),
  constraint activities_estimated_minutes_positive check (estimated_minutes > 0),
  constraint activities_actual_minutes_nonnegative check (actual_minutes >= 0),
  constraint activities_priority_valid check (priority between 0 and 4),
  constraint activities_status_valid check (
    status in ('active', 'in_progress', 'completed', 'cancelled', 'archived')
  ),
  constraint activities_notes_length check (notes_markdown is null or char_length(notes_markdown) <= 20000),
  constraint activities_source_valid check (source in ('manual', 'imported')),
  constraint activities_source_external_shape check (
    (source = 'manual' and source_external_id is null)
    or (source = 'imported' and source_external_id is not null and char_length(trim(source_external_id)) > 0)
  ),
  constraint activities_completion_valid check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  constraint activities_revision_positive check (revision > 0)
);

create unique index activities_external_source_unique
on public.activities (user_id, source, source_external_id)
where source_external_id is not null;

create table public.activity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  activity_id uuid not null,
  label text,
  url text not null,
  position smallint not null default 0,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_links_owner_unique unique (user_id, id),
  constraint activity_links_activity_owner_fk foreign key (user_id, activity_id)
    references public.activities (user_id, id) on delete cascade,
  constraint activity_links_label_length check (label is null or char_length(label) <= 120),
  constraint activity_links_url_valid check (
    char_length(url) <= 2048
    and url ~ '^https://[^[:space:]]+$'
    and url !~ '^https://([^/@]+@|localhost([/:]|$)|127\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.)'
  ),
  constraint activity_links_position_nonnegative check (position >= 0),
  constraint activity_links_revision_positive check (revision > 0)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  version integer not null,
  status text not null default 'proposal',
  feasibility text not null,
  generation_reason text not null,
  horizon_start_date date not null,
  horizon_end_date date not null,
  timezone text not null,
  planner_version text not null,
  rules_version text not null,
  input_hash text not null,
  output_hash text not null,
  requires_confirmation boolean not null default true,
  confirmed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint plans_owner_unique unique (user_id, id),
  constraint plans_user_version_unique unique (user_id, version),
  constraint plans_version_positive check (version > 0),
  constraint plans_status_valid check (status in ('proposal', 'published', 'superseded', 'rejected')),
  constraint plans_feasibility_valid check (feasibility in ('feasible', 'partial', 'infeasible')),
  constraint plans_generation_reason_not_blank check (char_length(trim(generation_reason)) > 0),
  constraint plans_horizon_valid check (
    horizon_end_date >= horizon_start_date
    and horizon_end_date - horizon_start_date <= 89
  ),
  constraint plans_versions_not_blank check (
    char_length(trim(planner_version)) > 0 and char_length(trim(rules_version)) > 0
  ),
  constraint plans_hashes_valid check (
    input_hash ~ '^[0-9a-f]{64}$' and output_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint plans_confirmation_valid check (confirmed_at is null or requires_confirmation),
  constraint plans_publication_valid check (
    (status = 'published' and published_at is not null)
    or (status <> 'published')
  )
);

create unique index plans_one_published_per_user
on public.plans (user_id)
where status = 'published';

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  activity_id uuid not null,
  source text not null,
  is_pinned boolean not null default false,
  status text not null default 'scheduled',
  skip_reason_code text,
  skip_reason_other text,
  created_by_plan_id uuid,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_owner_unique unique (user_id, id),
  constraint study_sessions_activity_owner_fk foreign key (user_id, activity_id)
    references public.activities (user_id, id),
  constraint study_sessions_plan_owner_fk foreign key (user_id, created_by_plan_id)
    references public.plans (user_id, id),
  constraint study_sessions_source_valid check (source in ('automatic', 'manual')),
  constraint study_sessions_status_valid check (
    status in ('scheduled', 'in_progress', 'completed', 'skipped', 'cancelled')
  ),
  constraint study_sessions_skip_valid check (
    (status <> 'skipped' and skip_reason_code is null and skip_reason_other is null)
    or (
      status = 'skipped'
      and skip_reason_code is not null
      and (skip_reason_code = 'other') = (skip_reason_other is not null)
      and (skip_reason_other is null or char_length(trim(skip_reason_other)) between 1 and 240)
    )
  ),
  constraint study_sessions_revision_positive check (revision > 0)
);

create table public.plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  plan_id uuid not null,
  session_id uuid not null,
  planned_start_at timestamptz not null,
  planned_end_at timestamptz not null,
  planned_minutes integer not null,
  change_kind text not null,
  rationale_code text not null,
  rationale_params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint plan_items_owner_unique unique (user_id, id),
  constraint plan_items_plan_session_unique unique (plan_id, session_id),
  constraint plan_items_plan_owner_fk foreign key (user_id, plan_id)
    references public.plans (user_id, id) on delete cascade,
  constraint plan_items_session_owner_fk foreign key (user_id, session_id)
    references public.study_sessions (user_id, id),
  constraint plan_items_interval_valid check (planned_start_at < planned_end_at),
  constraint plan_items_minutes_valid check (
    planned_minutes > 0
    and planned_minutes = extract(epoch from (planned_end_at - planned_start_at))::integer / 60
  ),
  constraint plan_items_change_kind_valid check (change_kind in ('created', 'kept', 'moved', 'removed')),
  constraint plan_items_rationale_not_blank check (char_length(trim(rationale_code)) > 0),
  constraint plan_items_rationale_object check (jsonb_typeof(rationale_params) = 'object')
);

create table public.session_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  session_id uuid not null,
  status text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  actual_minutes integer,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_executions_owner_unique unique (user_id, id),
  constraint session_executions_session_unique unique (session_id),
  constraint session_executions_session_owner_fk foreign key (user_id, session_id)
    references public.study_sessions (user_id, id),
  constraint session_executions_status_valid check (status in ('in_progress', 'completed', 'stopped')),
  constraint session_executions_shape_valid check (
    (status = 'in_progress' and ended_at is null and actual_minutes is null)
    or (
      status in ('completed', 'stopped')
      and ended_at is not null
      and ended_at >= started_at
      and actual_minutes is not null
      and actual_minutes >= 0
    )
  ),
  constraint session_executions_revision_positive check (revision > 0)
);

create unique index session_executions_one_running_per_user
on public.session_executions (user_id)
where status = 'in_progress';

create table public.plan_conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  plan_id uuid not null,
  code text not null,
  first_affected_deadline_at timestamptz not null,
  deficit_minutes integer not null,
  largest_available_window_minutes integer not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint plan_conflicts_owner_unique unique (user_id, id),
  constraint plan_conflicts_plan_owner_fk foreign key (user_id, plan_id)
    references public.plans (user_id, id) on delete cascade,
  constraint plan_conflicts_code_not_blank check (char_length(trim(code)) > 0),
  constraint plan_conflicts_deficit_positive check (deficit_minutes > 0),
  constraint plan_conflicts_window_nonnegative check (largest_available_window_minutes >= 0),
  constraint plan_conflicts_details_object check (jsonb_typeof(details) = 'object')
);

create table public.plan_conflict_activities (
  conflict_id uuid not null,
  activity_id uuid not null,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conflict_id, activity_id),
  constraint plan_conflict_activities_conflict_owner_fk foreign key (user_id, conflict_id)
    references public.plan_conflicts (user_id, id) on delete cascade,
  constraint plan_conflict_activities_activity_owner_fk foreign key (user_id, activity_id)
    references public.activities (user_id, id) on delete cascade
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  type text not null,
  severity text not null,
  subject_type text,
  subject_id uuid,
  cause_code text not null,
  action_code text not null,
  impact jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  resolved_at timestamptz,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alerts_owner_unique unique (user_id, id),
  constraint alerts_type_not_blank check (char_length(trim(type)) > 0),
  constraint alerts_severity_valid check (severity in ('info', 'attention', 'critical')),
  constraint alerts_subject_shape check ((subject_type is null) = (subject_id is null)),
  constraint alerts_cause_not_blank check (char_length(trim(cause_code)) > 0),
  constraint alerts_action_not_blank check (char_length(trim(action_code)) > 0),
  constraint alerts_impact_object check (jsonb_typeof(impact) = 'object'),
  constraint alerts_dedupe_not_blank check (char_length(trim(dedupe_key)) > 0),
  constraint alerts_revision_positive check (revision > 0)
);

create unique index alerts_open_dedupe_unique
on public.alerts (user_id, dedupe_key)
where resolved_at is null;

create table private.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  scope text not null,
  key_hash text not null,
  request_hash text not null,
  status text not null,
  response_reference text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idempotency_keys_user_scope_key_unique unique (user_id, scope, key_hash),
  constraint idempotency_keys_hashes_valid check (
    key_hash ~ '^[0-9a-f]{64}$' and request_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint idempotency_keys_status_valid check (status in ('in_progress', 'completed', 'failed'))
);

create table private.planner_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  plan_id uuid,
  idempotency_key_id uuid references private.idempotency_keys (id),
  contract_version text not null,
  rules_version text not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_ms integer,
  input_snapshot jsonb not null,
  output_snapshot jsonb,
  created_at timestamptz not null default now(),
  constraint planner_runs_plan_owner_fk foreign key (user_id, plan_id)
    references public.plans (user_id, id),
  constraint planner_runs_status_valid check (status in ('in_progress', 'completed', 'failed', 'timed_out')),
  constraint planner_runs_duration_nonnegative check (duration_ms is null or duration_ms >= 0),
  constraint planner_runs_input_object check (jsonb_typeof(input_snapshot) = 'object'),
  constraint planner_runs_output_object check (output_snapshot is null or jsonb_typeof(output_snapshot) = 'object')
);

create table private.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (user_id) on delete set null,
  actor_type text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  correlation_id text not null,
  changed_fields text[] not null default '{}',
  occurred_at timestamptz not null default now(),
  constraint audit_events_actor_valid check (actor_type in ('user', 'system')),
  constraint audit_events_action_not_blank check (char_length(trim(action)) > 0),
  constraint audit_events_entity_not_blank check (char_length(trim(entity_type)) > 0),
  constraint audit_events_correlation_not_blank check (char_length(trim(correlation_id)) > 0)
);

create index availability_windows_lookup_idx on public.availability_windows (user_id, status, day_of_week);
create index calendar_blocks_one_off_idx on public.calendar_blocks (user_id, starts_at, ends_at);
create index calendar_blocks_recurring_idx on public.calendar_blocks (user_id, day_of_week, valid_from, valid_until);
create index disciplines_lookup_idx on public.disciplines (user_id, status, lower(name));
create index activities_deadline_idx on public.activities (user_id, status, deadline_at);
create index activities_discipline_idx on public.activities (user_id, discipline_id, status);
create index activity_links_activity_idx on public.activity_links (user_id, activity_id, position);
create index plans_version_idx on public.plans (user_id, version desc);
create index study_sessions_lookup_idx on public.study_sessions (user_id, status, activity_id);
create index plan_items_schedule_idx on public.plan_items (plan_id, planned_start_at);
create index plan_items_session_idx on public.plan_items (user_id, session_id);
create index session_executions_lookup_idx on public.session_executions (user_id, status, started_at);
create index plan_conflicts_plan_idx on public.plan_conflicts (user_id, plan_id);
create index plan_conflict_activities_user_idx on public.plan_conflict_activities (user_id);
create index alerts_lookup_idx on public.alerts (user_id, resolved_at, severity, created_at desc);
create index planner_runs_user_idx on private.planner_runs (user_id, created_at desc);
create index audit_events_user_idx on private.audit_events (user_id, occurred_at desc);

create trigger availability_windows_bump_revision before update on public.availability_windows
for each row execute function private.bump_revision();
create trigger calendar_blocks_bump_revision before update on public.calendar_blocks
for each row execute function private.bump_revision();
create trigger disciplines_bump_revision before update on public.disciplines
for each row execute function private.bump_revision();
create trigger activities_bump_revision before update on public.activities
for each row execute function private.bump_revision();
create trigger activity_links_bump_revision before update on public.activity_links
for each row execute function private.bump_revision();
create trigger study_sessions_bump_revision before update on public.study_sessions
for each row execute function private.bump_revision();
create trigger session_executions_bump_revision before update on public.session_executions
for each row execute function private.bump_revision();
create trigger alerts_bump_revision before update on public.alerts
for each row execute function private.bump_revision();

alter table public.availability_windows enable row level security;
alter table public.calendar_blocks enable row level security;
alter table public.disciplines enable row level security;
alter table public.activities enable row level security;
alter table public.activity_links enable row level security;
alter table public.plans enable row level security;
alter table public.study_sessions enable row level security;
alter table public.plan_items enable row level security;
alter table public.session_executions enable row level security;
alter table public.plan_conflicts enable row level security;
alter table public.plan_conflict_activities enable row level security;
alter table public.alerts enable row level security;

revoke all on table
  public.availability_windows,
  public.calendar_blocks,
  public.disciplines,
  public.activities,
  public.activity_links,
  public.plans,
  public.study_sessions,
  public.plan_items,
  public.session_executions,
  public.plan_conflicts,
  public.plan_conflict_activities,
  public.alerts
from anon, authenticated;

grant select, insert, update on table public.availability_windows to authenticated;
grant select, insert, update, delete on table public.calendar_blocks to authenticated;
grant select, insert, update on table public.disciplines to authenticated;
grant select, insert, update on table public.activities to authenticated;
grant select, insert, update, delete on table public.activity_links to authenticated;
grant select on table public.plans to authenticated;
grant select on table public.study_sessions to authenticated;
grant select on table public.plan_items to authenticated;
grant select on table public.session_executions to authenticated;
grant select on table public.plan_conflicts to authenticated;
grant select on table public.plan_conflict_activities to authenticated;
grant select, update on table public.alerts to authenticated;

create policy availability_windows_select_own on public.availability_windows for select to authenticated
using ((select auth.uid()) = user_id);
create policy availability_windows_insert_own on public.availability_windows for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy availability_windows_update_own on public.availability_windows for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy calendar_blocks_select_own on public.calendar_blocks for select to authenticated
using ((select auth.uid()) = user_id);
create policy calendar_blocks_insert_own on public.calendar_blocks for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy calendar_blocks_update_own on public.calendar_blocks for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy calendar_blocks_delete_own on public.calendar_blocks for delete to authenticated
using ((select auth.uid()) = user_id);

create policy disciplines_select_own on public.disciplines for select to authenticated
using ((select auth.uid()) = user_id);
create policy disciplines_insert_own on public.disciplines for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy disciplines_update_own on public.disciplines for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy activities_select_own on public.activities for select to authenticated
using ((select auth.uid()) = user_id);
create policy activities_insert_own on public.activities for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy activities_update_own on public.activities for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy activity_links_select_own on public.activity_links for select to authenticated
using ((select auth.uid()) = user_id);
create policy activity_links_insert_own on public.activity_links for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy activity_links_update_own on public.activity_links for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy activity_links_delete_own on public.activity_links for delete to authenticated
using ((select auth.uid()) = user_id);

create policy plans_select_own on public.plans for select to authenticated
using ((select auth.uid()) = user_id);
create policy study_sessions_select_own on public.study_sessions for select to authenticated
using ((select auth.uid()) = user_id);
create policy plan_items_select_own on public.plan_items for select to authenticated
using ((select auth.uid()) = user_id);
create policy session_executions_select_own on public.session_executions for select to authenticated
using ((select auth.uid()) = user_id);
create policy plan_conflicts_select_own on public.plan_conflicts for select to authenticated
using ((select auth.uid()) = user_id);
create policy plan_conflict_activities_select_own on public.plan_conflict_activities for select to authenticated
using ((select auth.uid()) = user_id);
create policy alerts_select_own on public.alerts for select to authenticated
using ((select auth.uid()) = user_id);
create policy alerts_update_own on public.alerts for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema private revoke all on sequences from public, anon, authenticated;
alter default privileges in schema private revoke all on functions from public, anon, authenticated;
