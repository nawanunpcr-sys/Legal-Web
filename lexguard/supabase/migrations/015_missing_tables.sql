-- ตารางที่โค้ดเรียกใช้จริงแต่ไม่เคยมีนิยามใน schema.sql หรือ migrations
-- (เดิมถูกสร้างด้วยมือใน Supabase SQL editor) — reverse-engineer โครงสร้างจาก
-- การใช้งานจริงในโค้ด เพื่อให้ clone โปรเจกต์ไป setup ที่ใหม่ได้ครบ
--   • lg_settings        — src/lib/supabase.js  fetchSettings / saveSettings
--   • lg_import_staging  — api/law-analyze.js, api/agent-analyze.js, src/lib/supabase.js (staging AI)
--   • lg_reports         — src/lib/supabase.js  fetchReports / saveReport / markReportSubmitted
-- ใช้ create table if not exists + RLS permissive เหมือนตารางอื่น (เครื่องมือภายใน)

-- ── lg_settings — ค่าตั้งค่าแอปแบบแถวเดียว (id = 1) ────────────────────────────
create table if not exists lg_settings (
  id int primary key default 1,
  company_name text,
  subtitle text,
  org_name text,
  user_name text,
  brand_mark text,
  updated_at timestamptz default now()
);

-- ── lg_import_staging — ข้อกำหนดที่ AI สรุปไว้ รออนุมัติเข้าทะเบียน ──────────────
-- หนึ่งแถว = หนึ่งข้อกำหนด, จัดกลุ่มเป็นกฎหมายด้วย (cat, law_code) ฝั่งแอป
create table if not exists lg_import_staging (
  id bigint generated always as identity primary key,
  batch text,                                   -- รหัสชุดนำเข้า เช่น 'api-<ts>' / 'agent-<ts>'
  law_code text,
  law_name text,
  cat text,
  ministry text,
  issue_date text,
  announce_date text,
  effective_date text,
  doc_list text,
  req_seq int default 0,
  section_ref text,
  req_text text,
  responsible text,
  applicability text,
  method text,
  documents text,
  frequency text,
  other_terms text,
  source_url text,
  status text not null default 'proposed',      -- proposed | added | dismissed
  created_at timestamptz not null default now()
);
create index if not exists idx_lg_import_staging_status on lg_import_staging(status);

-- ── lg_reports — ทะเบียนรายงานที่ต้องส่งหน่วยงานราชการ + กำหนดส่งครั้งถัดไป ──────
create table if not exists lg_reports (
  id bigint generated always as identity primary key,
  title text not null,
  law_id bigint references lg_laws(id) on delete set null,
  law_code text,
  authority text,
  responsible text,
  format text,
  retention text,
  category text,
  timeline_text text,
  trigger_type text not null default 'fixed',   -- fixed (ตามปฏิทิน) | event (อิงวันเกิดเหตุ)
  recurrence text not null default 'annually',  -- once | monthly | quarterly | semiannually | annually | asneeded
  offset_days int,
  event_date date,
  next_due_date date,
  notify_days_before int not null default 30,
  note text,
  last_submitted_at timestamptz,
  file_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lg_reports_due on lg_reports(next_due_date);

-- ── RLS: permissive เหมือนตารางอื่น (เครื่องมือภายใน — ควรรัดกุมก่อนเปิดสาธารณะ) ──
alter table lg_settings       enable row level security;
alter table lg_import_staging enable row level security;
alter table lg_reports        enable row level security;
create policy lg_settings_all       on lg_settings       for all using (true) with check (true);
create policy lg_import_staging_all on lg_import_staging for all using (true) with check (true);
create policy lg_reports_all        on lg_reports        for all using (true) with check (true);
