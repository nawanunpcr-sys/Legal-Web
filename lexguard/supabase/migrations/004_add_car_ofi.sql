-- CAR / OFI module (corrective action requests + follow-ups + approvals)
create table if not exists lg_car (
  id bigint generated always as identity primary key,
  co_no text, ofi_no text, running_no text,
  year int,
  status text not null default 'open',          -- open | closed
  record_type text, owner text,
  issue_date date, auditor text, supervisor text,
  team text, division text, department text,
  finding text, corrective_action text, due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lg_car_status on lg_car(status);

create table if not exists lg_car_followups (
  id bigint generated always as identity primary key,
  car_id bigint references lg_car(id) on delete cascade,
  seq int default 0, check_date date,
  follower text, assessor text, verifier text,
  result text, conclusion text
);
create index if not exists idx_lg_car_fu on lg_car_followups(car_id);

create table if not exists lg_car_approvals (
  id bigint generated always as identity primary key,
  car_id bigint references lg_car(id) on delete cascade,
  seq int default 0, step text, approve_date date, approver text,
  status text default 'approved'
);
create index if not exists idx_lg_car_ap on lg_car_approvals(car_id);

alter table lg_car enable row level security;
alter table lg_car_followups enable row level security;
alter table lg_car_approvals enable row level security;
create policy lg_car_all on lg_car for all using (true) with check (true);
create policy lg_car_fu_all on lg_car_followups for all using (true) with check (true);
create policy lg_car_ap_all on lg_car_approvals for all using (true) with check (true);
