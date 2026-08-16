-- 040 · P17 — เก็บ "คำตอบของคำถาม" แทน "สรุปกฎหมายทั้งฉบับ"
--
-- ปัญหาที่แก้: ตัวบทไทยส่วนใหญ่อ้างลอยๆ ว่า "ตามกฎหมายว่าด้วยการควบคุมอาคาร"
-- ซึ่งเป็นกฎหมายทั้งชุดหลายร้อยหน้า · ระบบเดิมไปดึงทั้งฉบับแล้วเลือกมา 15 ข้อแรก
-- ได้ข้อกำหนดที่ไม่เกี่ยวกับสิ่งที่ข้อนั้นถามถึงเลย
--
-- ของใหม่: แปลงการอ้างถึงเป็น "คำถาม" ก่อนค้น แล้วเก็บ "คำตอบ" ไว้ใช้ซ้ำ
--   ข้อ 9 "ต้องมีห้องน้ำตามแบบและจำนวนที่กำหนดในกฎหมายควบคุมอาคาร"
--   → คำถาม: "อาคารสำนักงานต้องมีที่ถ่ายอุจจาระ/ปัสสาวะ/อ่างล้างมืออย่างละกี่ที่ ต่อพื้นที่เท่าไร"
--   → คำตอบ: กฎกระทรวง ฉบับที่ 39 (พ.ศ. 2537) ข้อ 8 + ตารางที่ 2
--
-- cache ผูกกับ "คำถาม" ไม่ใช่ "ชื่อกฎหมาย" เพราะกฎหมายฉบับเดียวตอบได้หลายคำถาม
-- และคำถามเดียวกันจากกฎหมายคนละฉบับก็ใช้คำตอบเดิมได้
--
-- idempotent · รันซ้ำได้

create table if not exists lg_ref_answers (
  id                uuid primary key default gen_random_uuid(),
  question_key      text not null unique,   -- normalize จาก anchor_question (ตัดช่องว่าง/เลขไทย/ตัวพิมพ์)
  anchor_question   text not null,
  ref_type          text not null default 'whole_law',
  answer_plain      text default '',        -- คำตอบภาษาที่คนทั่วไปเข้าใจ ขึ้นต้นด้วยกริยา
  answer_detail     jsonb default '{}'::jsonb,
  law_name          text default '',        -- กฎหมายที่ให้คำตอบ (ชื่อเต็ม)
  section_ref       text default '',        -- ข้อ/มาตราที่ให้คำตอบ
  from_table        boolean default false,  -- คำตอบมาจากตาราง/บัญชีท้ายกฎหมายหรือไม่
  source_excerpt    text default '',        -- ข้อความจากตัวบทจริงที่รองรับคำตอบ (บังคับเมื่อ answered)
  source_url        text default '',
  status            text not null default 'not_answered',
  confidence        text default '',
  note              text default '',
  resolved_at       timestamptz not null default now()
);

alter table lg_ref_answers drop constraint if exists lg_ref_answers_status_check;
alter table lg_ref_answers add constraint lg_ref_answers_status_check
  check (status in ('answered','not_answered','pending_issuance'));

alter table lg_ref_answers drop constraint if exists lg_ref_answers_ref_type_check;
alter table lg_ref_answers add constraint lg_ref_answers_ref_type_check
  check (ref_type in ('specific','whole_law','pending'));

-- อ่าน cache ด้วย question_key + อายุคำตอบ → index คู่นี้พอ (unique ให้ question_key อยู่แล้ว)
create index if not exists lg_ref_answers_resolved_idx on lg_ref_answers (resolved_at desc);

-- คำตอบที่ผูกกับข้อนั้นๆ (1 ข้ออาจมีมากกว่า 1 คำตอบ) — เก็บติดไปกับข้อ
-- เพื่อให้เปิดทะเบียนย้อนหลังแล้วยังเห็นว่าข้อนี้อ้างถึงอะไรและได้คำตอบว่าอย่างไร
alter table lg_requirements   add column if not exists ref_answers jsonb default '[]'::jsonb;
alter table lg_import_staging add column if not exists ref_answers jsonb default '[]'::jsonb;

-- RLS · ตารางนี้เป็น cache สาธารณะเหมือน lg_law_refs (ไม่มีข้อมูลของผู้ใช้)
alter table lg_ref_answers enable row level security;
drop policy if exists lg_ref_answers_all on lg_ref_answers;
create policy lg_ref_answers_all on lg_ref_answers for all using (true) with check (true);

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- alter table lg_requirements   drop column if exists ref_answers;
-- alter table lg_import_staging drop column if exists ref_answers;
-- drop table if exists lg_ref_answers;
