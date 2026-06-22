-- Scheduled agents: handoff queue (gazette -> analyze) + run log
create table if not exists lg_agent_queue (
  id bigint generated always as identity primary key,
  source_url text, title text, raw_text text,
  publication_date text, effective_date text, category_guess text,
  status text not null default 'pending',   -- pending | processed | error
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists idx_lg_agent_queue_status on lg_agent_queue(status);

create table if not exists lg_agent_runs (
  id bigint generated always as identity primary key,
  agent text,                               -- gazette | analyze
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  scanned int default 0, created int default 0, errors int default 0, note text
);
create index if not exists idx_lg_agent_runs_agent on lg_agent_runs(agent, started_at desc);

alter table lg_agent_queue enable row level security;
alter table lg_agent_runs enable row level security;
create policy lg_agent_queue_all on lg_agent_queue for all using (true) with check (true);
create policy lg_agent_runs_all on lg_agent_runs for all using (true) with check (true);
