-- P10 · New simplified 2-workflow Process Tracker (per law).
-- Replaces the *UI* of the old Process Tracker (lg_process_tracker) + assessment
-- flow (lg_assessment_flow / lg_improvement_plans). Those tables are KEPT AS-IS
-- (no data loss, fully reversible) — this migration only ADDS new objects.
--
-- DATA MAP NOTE: verified on project exugnmdsyqbqtxsrwhbm (2026-07-16) that
-- lg_process_tracker and lg_process_items are EMPTY (0 rows), so there is no
-- legacy tracker status to carry over — the "map old status -> new status" step
-- is a no-op here. Re-verify row counts before running on any environment that
-- has accumulated tracker rows.
--
-- lg_law_workflow = single source of truth for the per-law Process Tracker.
-- A law can accumulate several cases over its life:
--   · one workflow_type='add'     case created when it is first registered
--   · one workflow_type='monitor' case per follow-up / re-verification round
-- 3-process lifecycle:  1 ผู้ตรวจสอบ (Owner) -> 2 ผู้ประเมิน -> 3 เสร็จสิ้น
-- status set (the "new enum" this task narrows to):
--   รอประเมิน · สอดคล้อง · ไม่สอดคล้อง · เสร็จสิ้น

create table if not exists lg_law_workflow (
  id uuid primary key default gen_random_uuid(),
  law_id bigint references lg_laws(id) on delete cascade,
  discovered_law_id uuid,                 -- FK to lg_ai_discovered_laws added in migration 022 (Task 4)
  workflow_type text not null default 'add' check (workflow_type in ('add','monitor')),
  stage smallint not null default 1 check (stage between 1 and 3),
  status text not null default 'รอประเมิน'
    check (status in ('รอประเมิน','สอดคล้อง','ไม่สอดคล้อง','เสร็จสิ้น')),

  -- Process 1 · ผู้ตรวจสอบ (Owner)
  owner_name   text,
  owner_at     timestamptz,               -- วันที่ตรวจ (real timestamp, ไม่ให้แก้ใน UI)
  follow_issue text,                       -- Workflow B: ประเด็นที่ต้องติดตาม

  -- Process 2 · ผู้ประเมิน
  assessor_name    text,
  assessed_at      timestamptz,            -- วันที่ประเมิน (real timestamp)
  assess_result    text check (assess_result in ('สอดคล้อง','ไม่สอดคล้อง')),
  improvement_plan text,                   -- กรณี ไม่สอดคล้อง (NC)
  measure          text,                   -- มาตรการจัดการ
  reverify_date    date,                   -- วันกำหนดทวนสอบ

  -- Process 3 · เสร็จสิ้น / ปิดแผน (Workflow B)
  plan_closed_at timestamptz,
  plan_closed_by text,
  completed_at   timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_lg_law_workflow_law    on lg_law_workflow(law_id);
create index if not exists idx_lg_law_workflow_status on lg_law_workflow(status);
create index if not exists idx_lg_law_workflow_stage  on lg_law_workflow(stage);

-- RLS: match the anon-key pattern used by every other lg_* table (migration 015/018)
alter table lg_law_workflow enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='lg_law_workflow' and policyname='lg_law_workflow_all') then
    create policy lg_law_workflow_all on lg_law_workflow for all using (true) with check (true);
  end if;
end $$;

-- Realtime: keep the tracker live across tabs/users (Task 6)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='lg_law_workflow') then
    alter publication supabase_realtime add table lg_law_workflow;
  end if;
end $$;

-- Deprecate (do NOT drop) the old tracker/assessment tables — kept for reference.
comment on table lg_process_tracker is 'DEPRECATED (P10) — replaced by lg_law_workflow UI. Kept read-only, no new writes.';
comment on table lg_assessment_flow is 'DEPRECATED (P10) — replaced by lg_law_workflow. Kept read-only, no new writes.';

-- ── DOWN (reversible) ───────────────────────────────────────────────────────
-- alter publication supabase_realtime drop table lg_law_workflow;
-- drop table if exists lg_law_workflow;
