-- P10 · Task 12 — Search Log (หลักฐานการติดตามกฎหมายสม่ำเสมอ, ISO 45001 ข้อ 6.1.3).
-- บันทึกทุกครั้งที่กด "ค้นหากฎหมาย" รวมกรณี "ไม่มีกฎหมายออกใหม่" (no_new_laws=true)
-- ซึ่งคือหลักฐานสำคัญว่ามีการติดตามแม้ไม่พบกฎหมายใหม่.

create table if not exists lg_search_log (
  id uuid primary key default gen_random_uuid(),
  searched_by text not null,
  searched_at timestamptz default now(),
  sources text[],                -- ['ratchakitcha','shawpat']
  results_count int default 0,
  result_summary jsonb,          -- รายชื่อกฎหมายที่เจอ (ถ้ามี)
  no_new_laws boolean default false
);

create index if not exists idx_lg_search_log_at on lg_search_log(searched_at desc);

alter table lg_search_log enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='lg_search_log' and policyname='lg_search_log_all') then
    create policy lg_search_log_all on lg_search_log for all using (true) with check (true);
  end if;
end $$;

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- drop table if exists lg_search_log;
