-- Migration 001: Monthly compliance check tracking
-- Run this in the Supabase SQL editor to add monthly check-off support.

create table if not exists lg_compliance_months (
  id bigint generated always as identity primary key,
  year int not null,
  month int not null check (month between 1 and 12),
  checked boolean not null default false,
  checked_at timestamptz,
  note text,
  unique(year, month)
);

create index if not exists idx_lg_comp_months_year on lg_compliance_months(year);

alter table lg_compliance_months enable row level security;

create policy lg_months_all on lg_compliance_months
  for all using (true) with check (true);
