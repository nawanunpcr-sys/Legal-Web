-- Audit log: real dated events (add / edit / repeal / restore / import)
create table if not exists lg_activity_log (
  id bigint generated always as identity primary key,
  action text not null,        -- create | repeal | restore | requirement | import
  law_id bigint,
  law_code text,
  law_name text,
  detail text,
  actor text,
  created_at timestamptz not null default now()
);
create index if not exists idx_lg_activity_created on lg_activity_log(created_at desc);
alter table lg_activity_log enable row level security;
create policy lg_activity_all on lg_activity_log for all using (true) with check (true);
