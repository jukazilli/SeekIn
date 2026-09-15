alter table private.planner_runs
add constraint planner_runs_snapshots_no_content check (
  not jsonb_path_exists(input_snapshot, '$.**.title')
  and not jsonb_path_exists(input_snapshot, '$.**.notes')
  and not jsonb_path_exists(input_snapshot, '$.**.notesMarkdown')
  and not jsonb_path_exists(input_snapshot, '$.**.email')
  and not jsonb_path_exists(input_snapshot, '$.**.links')
  and (
    output_snapshot is null
    or (
      not jsonb_path_exists(output_snapshot, '$.**.title')
      and not jsonb_path_exists(output_snapshot, '$.**.notes')
      and not jsonb_path_exists(output_snapshot, '$.**.notesMarkdown')
      and not jsonb_path_exists(output_snapshot, '$.**.email')
      and not jsonb_path_exists(output_snapshot, '$.**.links')
    )
  )
);

comment on constraint planner_runs_snapshots_no_content on private.planner_runs is
  'Impede conteúdo acadêmico livre e identificadores pessoais nos snapshots técnicos do planner.';
