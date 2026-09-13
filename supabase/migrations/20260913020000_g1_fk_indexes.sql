-- G1 performance hardening: cover every foreign key reported by the
-- Supabase performance advisor after the schema/RLS migration.

create index planner_runs_idempotency_key_idx
on private.planner_runs (idempotency_key_id);

create index planner_runs_plan_owner_idx
on private.planner_runs (user_id, plan_id);

create index plan_conflict_activities_activity_owner_idx
on public.plan_conflict_activities (user_id, activity_id);

create index plan_conflict_activities_conflict_owner_idx
on public.plan_conflict_activities (user_id, conflict_id);

create index plan_items_plan_owner_idx
on public.plan_items (user_id, plan_id);

create index session_executions_session_owner_idx
on public.session_executions (user_id, session_id);

create index study_sessions_activity_owner_idx
on public.study_sessions (user_id, activity_id);

create index study_sessions_plan_owner_idx
on public.study_sessions (user_id, created_by_plan_id);
