-- P9 · Merge the two tracking systems into ONE Process Tracker.
-- lg_process_tracker becomes the single source of truth and grows from a
-- 3-stage per-law workflow into a 5-stage lifecycle:
--   1 ai_search      AI ค้นหา/วิเคราะห์            ผู้ค้นหา/วิเคราะห์
--   2 verify_content ทวนสอบเนื้อหา AI              ผู้ทวนสอบเนื้อหา
--   3 assess         ประเมินความสอดคล้อง          หน่วยงานที่เกี่ยวข้อง
--   4 approve        อนุมัติเข้าทะเบียน            Admin
--   5 monitor        ติดตาม/ทวนสอบตามรอบ          ผู้ทวนสอบ
--
-- BACKUP NOTE: this migration DROPs and re-seeds the lg_process_substatus
-- lookup rows, and REMAPs lg_process_tracker.stage values (old 2→3, old 3→5).
-- Verified against project exugnmdsyqbqtxsrwhbm on 2026-07-13: both
-- lg_process_tracker and lg_process_items are EMPTY (0 rows) and lg_review_log
-- has 0 rows, so the remap/re-seed touches no live data. Re-verify row counts
-- before running against any environment that has accumulated data; take a
-- backup of these three tables if so.

-- 1) Widen the stage domain 1..3 -> 1..5 -------------------------------------
alter table lg_process_tracker drop constraint if exists lg_process_tracker_stage_check;

-- 2) Remap any existing rows to the new stage numbering (atomic, collision-safe)
--    old 1 (search/register)      -> new 1 (ai_search)
--    old 2 (agency does the work) -> new 3 (assess)
--    old 3 (verifier)             -> new 5 (monitor)
update lg_process_tracker
   set stage = case stage when 3 then 5 when 2 then 3 else stage end;

-- 3) Now enforce the new domain
alter table lg_process_tracker
  add constraint lg_process_tracker_stage_check check (stage between 1 and 5);

-- 4) New lifecycle columns ---------------------------------------------------
alter table lg_process_tracker add column if not exists assessment_round int  not null default 1;  -- ครั้งที่ประเมิน (stage 3, +1 each re-entry)
alter table lg_process_tracker add column if not exists review_round     int  not null default 0;  -- ครั้งที่ทวนสอบ (stage 5)
alter table lg_process_tracker add column if not exists last_review_date date;
alter table lg_process_tracker add column if not exists next_review_date date;
alter table lg_process_tracker add column if not exists completed_at     timestamptz;              -- per-stage close time (started_at already exists)

create index if not exists idx_lg_process_tracker_stage on lg_process_tracker(stage);
create index if not exists idx_lg_process_tracker_next_review on lg_process_tracker(next_review_date);

-- 5) Re-seed the substatus lookup for the 5 stages ---------------------------
delete from lg_process_substatus;
insert into lg_process_substatus (stage,code,label,sort) values
 (1,'pending_search','รอค้นหา',1),(1,'searching','กำลังค้นหา/วิเคราะห์',2),(1,'analyzed','วิเคราะห์เสร็จ',3),
 (2,'pending_verify','รอทวนสอบ',1),(2,'verifying','กำลังทวนสอบ',2),(2,'verified','ทวนสอบผ่าน',3),
 (3,'pending_assign','รอมอบหมาย',1),(3,'assessing','กำลังประเมิน',2),(3,'assessed','ประเมินเสร็จ',3),
 (4,'pending_approve','รออนุมัติ',1),(4,'approved','อนุมัติแล้ว',2),
 (5,'scheduled','กำหนดรอบแล้ว',1),(5,'reviewing','กำลังทวนสอบ',2),(5,'reviewed','ทวนสอบแล้ว',3),(5,'overdue','เกินกำหนด',4)
on conflict (stage,code) do nothing;

-- 6) Review log: lg_review_log already exists (migration 010) and is reused by
--    logReview(). Expose it on realtime so the tracker timeline stays live.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='lg_review_log') then
    alter publication supabase_realtime add table lg_review_log;
  end if;
end $$;

-- 7) next_review_date backfill: lg_laws has NO review-frequency column, so
--    stage-5 rows are left null here; the app computes next_review_date on the
--    first logReview() call (fallback: last_review_date + 12 months).

-- 8) Deprecate the free-form kanban table. It is NOT dropped — kept read-only
--    for reference until the UI merge is confirmed in production.
comment on table lg_process_items is
  'DEPRECATED (P9) — merged into lg_process_tracker (5-stage lifecycle). No new writes; safe to drop once UnifiedTracker is confirmed.';
