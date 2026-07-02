-- Process Tracker: workflow items moving through 4 stages/roles
create table if not exists lg_process_items (
  id bigint generated always as identity primary key,
  title text not null,
  ref_type text, ref_id bigint,
  stage text not null default 'discovery',  -- discovery | review | forward | verify | done
  assignee text, note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lg_process_stage on lg_process_items(stage);
alter table lg_process_items enable row level security;
create policy lg_process_all on lg_process_items for all using (true) with check (true);
