-- LexGuard SHE — Database schema (namespaced lg_* tables)
-- Apply in Supabase SQL editor if recreating in another project.

create table if not exists lg_categories (
  code text primary key, name text not null, color text not null, sort_order int default 0);

create table if not exists lg_laws (
  id bigint generated always as identity primary key,
  code text unique not null, cat text not null references lg_categories(code),
  ministry text, name text not null, issue_date text,
  status text not null default 'ok', review_date date,
  created_at timestamptz default now(), updated_at timestamptz default now());
create index if not exists idx_lg_laws_cat on lg_laws(cat);
create index if not exists idx_lg_laws_review on lg_laws(review_date);

create table if not exists lg_requirements (
  id bigint generated always as identity primary key,
  law_id bigint references lg_laws(id) on delete cascade,
  seq int default 0, text text not null, status text not null default 'met',
  responsible text, frequency text, documents text, note text);
create index if not exists idx_lg_req_law on lg_requirements(law_id);

create table if not exists lg_communications (
  id bigint generated always as identity primary key,
  scope text not null, topic text not null, sender text, receiver text, frequency text, method text);

alter table lg_categories enable row level security;
alter table lg_laws enable row level security;
alter table lg_requirements enable row level security;
alter table lg_communications enable row level security;

-- NOTE: permissive policies for an internal tool. Add Supabase Auth + tighten before public release.
create policy lg_cat_all  on lg_categories     for all using (true) with check (true);
create policy lg_laws_all on lg_laws           for all using (true) with check (true);
create policy lg_req_all  on lg_requirements   for all using (true) with check (true);
create policy lg_comm_all on lg_communications for all using (true) with check (true);
