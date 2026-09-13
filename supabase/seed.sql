-- SKN-016: seed sintético, determinístico e idempotente do ambiente G1 Dev.
-- O comando canônico fixa o project ref isolado; nunca executar no beta ou em produção.

begin;

delete from auth.identities
where user_id in ('11000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002');

-- A remoção é limitada aos UUIDs reservados para fixtures e limpa suas árvores por cascade.
delete from auth.users
where id in ('11000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000', '11000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'user-a@example.test',
    extensions.crypt('seekin-e2e-only', '$2a$06$abcdefghijklmnopqrstuu'), '2026-09-14T12:00:00Z',
    '{"provider":"email","providers":["email"]}'::jsonb, '{"fixture_id":"FX-USERS-002"}'::jsonb,
    '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', '22000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'user-b@example.test',
    extensions.crypt('seekin-e2e-only', '$2a$06$abcdefghijklmnopqrstuu'), '2026-09-14T12:00:00Z',
    '{"provider":"email","providers":["email"]}'::jsonb, '{"fixture_id":"FX-USERS-002"}'::jsonb,
    '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z', '', '', '', ''
  );

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  (
    '11000000-0000-4000-8000-000000000101', '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000001',
    '{"sub":"11000000-0000-4000-8000-000000000001","email":"user-a@example.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email', '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  ),
  (
    '22000000-0000-4000-8000-000000000102', '22000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000002',
    '{"sub":"22000000-0000-4000-8000-000000000002","email":"user-b@example.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email', '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  );

insert into public.profiles (
  user_id, display_name, timezone, onboarding_status, onboarding_step,
  onboarding_completed_at, created_at, updated_at
)
values
  (
    '11000000-0000-4000-8000-000000000001', 'Pessoa sintética A', 'America/Sao_Paulo',
    'completed', 7, '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  ),
  (
    '22000000-0000-4000-8000-000000000002', 'Pessoa sintética B', 'America/Sao_Paulo',
    'completed', 7, '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  );

insert into public.user_preferences (
  user_id, week_starts_on, preferred_session_minutes, minimum_session_minutes,
  capacity_reserve_percent, created_at, updated_at
)
values
  ('11000000-0000-4000-8000-000000000001', 1, 50, 25, 20, '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'),
  ('22000000-0000-4000-8000-000000000002', 1, 50, 25, 20, '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z');

insert into public.availability_windows (
  id, user_id, day_of_week, start_local, end_local, timezone, valid_from,
  status, created_at, updated_at
)
values
  (
    '11000000-0000-4000-8000-000000000011', '11000000-0000-4000-8000-000000000001',
    1, '18:00:00', '20:00:00', 'America/Sao_Paulo', '2026-09-14', 'active',
    '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  ),
  (
    '22000000-0000-4000-8000-000000000012', '22000000-0000-4000-8000-000000000002',
    2, '19:00:00', '21:00:00', 'America/Sao_Paulo', '2026-09-14', 'active',
    '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  );

insert into public.calendar_blocks (
  id, user_id, title, kind, source, starts_at, ends_at, timezone, created_at, updated_at
)
values (
  '11000000-0000-4000-8000-000000000013', '11000000-0000-4000-8000-000000000001',
  'Compromisso sintético', 'one_off', 'manual', '2026-09-15T16:00:00Z',
  '2026-09-15T17:00:00Z', 'America/Sao_Paulo', '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
);

insert into public.disciplines (
  id, user_id, name, description, color_key, status, created_at, updated_at
)
values
  (
    '11000000-0000-4000-8000-000000000014', '11000000-0000-4000-8000-000000000001',
    'Disciplina A', 'Conteúdo sintético para desenvolvimento.', 'blue-600', 'active',
    '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  ),
  (
    '22000000-0000-4000-8000-000000000024', '22000000-0000-4000-8000-000000000002',
    'Disciplina B', 'Conteúdo sintético para isolamento.', 'blue-500', 'active',
    '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  );

insert into public.activities (
  id, user_id, discipline_id, title, activity_type, deadline_local_date,
  deadline_local_time, deadline_timezone, deadline_at, deadline_has_time,
  estimated_minutes, actual_minutes, priority, status, source, created_at, updated_at
)
values
  (
    '11000000-0000-4000-8000-000000000021', '11000000-0000-4000-8000-000000000001',
    '11000000-0000-4000-8000-000000000014', 'Atividade A', 'assignment', '2026-09-18',
    null, 'America/Sao_Paulo', '2026-09-19T02:59:00Z', false, 100, 0, 3, 'active', 'manual',
    '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  ),
  (
    '22000000-0000-4000-8000-000000000022', '22000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000024', 'Atividade B', 'reading', '2026-09-18',
    '21:00:00', 'America/Sao_Paulo', '2026-09-19T00:00:00Z', true, 50, 0, 2, 'active', 'manual',
    '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  );

insert into public.plans (
  id, user_id, version, status, feasibility, generation_reason, horizon_start_date,
  horizon_end_date, timezone, planner_version, rules_version, input_hash, output_hash,
  requires_confirmation, confirmed_at, published_at, created_at
)
values
  (
    '11000000-0000-4000-8000-000000000031', '11000000-0000-4000-8000-000000000001',
    1, 'published', 'feasible', 'initial_fixture', '2026-09-14', '2026-09-27',
    'America/Sao_Paulo', 'planner-v1', 'planner-rules-v1', repeat('a', 64), repeat('b', 64),
    true, '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
  ),
  (
    '11000000-0000-4000-8000-000000000032', '11000000-0000-4000-8000-000000000001',
    2, 'proposal', 'feasible', 'fixture_replan', '2026-09-14', '2026-09-27',
    'America/Sao_Paulo', 'planner-v1', 'planner-rules-v1', repeat('c', 64), repeat('d', 64),
    true, null, null, '2026-09-14T12:05:00Z'
  );

insert into public.study_sessions (
  id, user_id, activity_id, source, is_pinned, status, created_by_plan_id, created_at, updated_at
)
values (
  '11000000-0000-4000-8000-000000000041', '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000021', 'automatic', true, 'scheduled',
  '11000000-0000-4000-8000-000000000031', '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
);

insert into public.plan_items (
  id, user_id, plan_id, session_id, planned_start_at, planned_end_at,
  planned_minutes, change_kind, rationale_code, rationale_params, created_at
)
values (
  '11000000-0000-4000-8000-000000000051', '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000031', '11000000-0000-4000-8000-000000000041',
  '2026-09-14T21:00:00Z', '2026-09-14T21:50:00Z', 50, 'created',
  'deadline_priority', '{"fixture_id":"FX-PLAN-003"}'::jsonb, '2026-09-14T12:00:00Z'
);

insert into public.alerts (
  id, user_id, type, severity, subject_type, subject_id, cause_code,
  action_code, impact, dedupe_key, created_at, updated_at
)
values (
  '11000000-0000-4000-8000-000000000061', '11000000-0000-4000-8000-000000000001',
  'deadline_attention', 'attention', 'activity', '11000000-0000-4000-8000-000000000021',
  'deadline_near', 'review_plan', '{"remaining_minutes":100}'::jsonb,
  'fixture:deadline:activity-a', '2026-09-14T12:00:00Z', '2026-09-14T12:00:00Z'
);

commit;

select jsonb_build_object(
  'fixtureVersion', 1,
  'users', (select count(*) from auth.users where id in (
    '11000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002'
  )),
  'profiles', (select count(*) from public.profiles where user_id in (
    '11000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002'
  )),
  'activities', (select count(*) from public.activities where user_id in (
    '11000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002'
  )),
  'plans', (select count(*) from public.plans where user_id = '11000000-0000-4000-8000-000000000001'),
  'sessions', (select count(*) from public.study_sessions where user_id = '11000000-0000-4000-8000-000000000001'),
  'fingerprint', (
    select md5(jsonb_build_object(
      'profiles', (select jsonb_agg(jsonb_build_array(user_id, display_name, timezone) order by user_id)
        from public.profiles where user_id in (
          '11000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002'
        )),
      'activities', (select jsonb_agg(jsonb_build_array(id, user_id, title, deadline_at, estimated_minutes) order by id)
        from public.activities where user_id in (
          '11000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000002'
        )),
      'plans', (select jsonb_agg(jsonb_build_array(id, version, status, input_hash, output_hash) order by id)
        from public.plans where user_id = '11000000-0000-4000-8000-000000000001'),
      'sessions', (select jsonb_agg(jsonb_build_array(id, activity_id, is_pinned, status) order by id)
        from public.study_sessions where user_id = '11000000-0000-4000-8000-000000000001')
    )::text)
  )
) as seed_summary;
