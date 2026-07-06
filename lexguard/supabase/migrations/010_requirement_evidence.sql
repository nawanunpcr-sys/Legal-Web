-- Requirement-level compliance evidence + per-law review history
-- Adds who/when a requirement was evaluated and an optional evidence file link,
-- plus a review log so each law keeps a dated history of compliance reviews.

-- 1) Evidence / evaluation metadata on each requirement
alter table lg_requirements add column if not exists evaluated_by   text;
alter table lg_requirements add column if not exists evaluated_at   timestamptz;
alter table lg_requirements add column if not exists evidence_url   text;
alter table lg_requirements add column if not exists evidence_label text;

-- 2) Law review history
create table if not exists lg_review_log (
  id bigint generated always as identity primary key,
  law_id      bigint references lg_laws(id) on delete cascade,
  review_date date not null,
  reviewer    text,
  result      text,          -- ไม่มีการเปลี่ยนแปลง | มีการแก้ไข | ถูกยกเลิก
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_lg_review_log_law on lg_review_log(law_id);

-- RLS (authenticated) — same permissive-per-authenticated approach as prior migrations
alter table lg_review_log enable row level security;
create policy lg_review_log_all on lg_review_log
  for all to authenticated using (true) with check (true);
