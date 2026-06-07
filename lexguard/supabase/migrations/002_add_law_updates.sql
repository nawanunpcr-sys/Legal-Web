-- Law-update feed (e.g. SHAWPAT OSH-law) + notification deep-link
alter table lg_notification_log add column if not exists link text;

create table if not exists lg_law_updates (
  id text primary key,
  title text not null,
  url text,
  source text,
  published_date date,
  seen_at timestamptz not null default now(),
  notified boolean not null default true
);
create index if not exists idx_lg_law_updates_seen on lg_law_updates(seen_at desc);
alter table lg_law_updates enable row level security;
create policy lg_law_updates_all on lg_law_updates for all using (true) with check (true);
