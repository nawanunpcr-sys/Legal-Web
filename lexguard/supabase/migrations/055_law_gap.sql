-- 055 · P25 ขั้นที่ 6 · สรุปช่องว่างระดับฉบับ + บันทึกความครบของบริบทตอนแตกข้อย่อย
--
-- ปัญหาที่แก้
--   1) ระบบบอกได้ว่าข้อย่อยใดยังไม่ทำ แต่ไม่มีที่ใดตอบเป็นภาษาคนว่า "ทั้งฉบับนี้
--      องค์กรขาดอะไรเป็นหลัก และต้องลงมือทำอะไรก่อน" — ผู้บริหารอ่านตารางติ๊กไม่รู้เรื่อง
--   2) req-breakdown.js ประกอบบริบทด้วย .filter(Boolean) ถ้า ai_summary (ขั้นที่ 5) หรือ
--      action_guide (ขั้นที่ 2) ยังว่าง มันจะแตกข้อย่อยจากตัวบทเปล่าเงียบๆ โดยไม่มีใครรู้
--      ผลประเมินทั้งชุดที่ตามมาจึงอาจตั้งอยู่บนข้อย่อยที่คุณภาพต่ำกว่าที่ควร
--
-- ═══ กติกาข้อ 9 · additive-only ═══
-- สร้างตารางใหม่ 1 ตาราง + เพิ่มคอลัมน์ใหม่ 1 คอลัมน์แบบ add column if not exists
-- ไม่มี UPDATE/DELETE ข้อมูลเดิม · ไม่แตะ lg_requirements.status
-- ไม่แตะ lg_law_relevance.confirmed_verdict

begin;

-- ── ผลสรุปช่องว่างระดับฉบับ ────────────────────────────────────────────────
-- 1 ฉบับมีสรุป "ล่าสุด" ชุดเดียว (law_id unique) — ไม่เก็บประวัติหลายรอบ
-- เพราะสรุปนี้เป็นผลพลอยได้ที่สร้างใหม่ได้ตลอดจากผลติ๊กที่เป็นแหล่งความจริงจริงๆ
create table if not exists lg_law_gap (
  id           bigint generated always as identity primary key,
  law_id       bigint not null unique references lg_laws(id) on delete cascade,

  headline     text,          -- สรุปภาพรวม 2-3 บรรทัด
  gaps         jsonb not null default '[]'::jsonb,   -- โครงตาม prompt: title/why_it_matters/to_close/evidence/sub_req_ids/priority
  caution      text,          -- เฉพาะกรณีข้อมูลไม่พอสรุป

  -- ตัวเลขที่ "กติกา" คำนวณไว้ (ไม่ใช่ AI นับ) — เก็บไว้ให้ตรวจย้อนหลังได้ว่าสรุปจากอะไร
  -- { total, met, unmet, na, pending, by_risk: {critical,high,medium,low}, requirements }
  stats        jsonb not null default '{}'::jsonb,

  model        text,
  generated_at timestamptz not null default now(),
  generated_by text
);

create index if not exists lg_law_gap_law_idx on lg_law_gap(law_id);

comment on table lg_law_gap is
  'สรุปช่องว่างระดับฉบับ (P25 ขั้นที่ 6) · gaps มาจาก AI เรียบเรียง · stats มาจากกติกาคำนวณ ห้ามให้ AI นับเอง';
comment on column lg_law_gap.stats is
  'ตัวเลขที่กติกาคำนวณจาก lg_sub_requirements — เก็บไว้ตรวจย้อนหลังว่าสรุปชุดนี้ตั้งอยู่บนข้อมูลชุดใด';
comment on column lg_law_gap.gaps is
  'ข้อเสนอจาก AI เท่านั้น ไม่ใช่สถานะความสอดคล้อง · การตัดสินสถานะยังเป็นดุลพินิจของผู้ประเมิน';

alter table lg_law_gap enable row level security;
drop policy if exists lg_law_gap_all on lg_law_gap;
create policy lg_law_gap_all on lg_law_gap for all using (true) with check (true);

-- ── ความครบของบริบทตอนแตกข้อย่อย ───────────────────────────────────────────
-- full    = มีทั้งสาระสำคัญทั้งฉบับ (ขั้น 5) และคู่มือปฏิบัติ (ขั้น 2)
-- partial = มีอย่างใดอย่างหนึ่ง
-- bare    = ไม่มีเลย — แตกจากตัวบทล้วน ควรกดสร้างใหม่หลังทำขั้น 2 และ 5
-- unknown = ค่าตั้งต้นของแถวที่มีอยู่ก่อน migration นี้
--           แถวเก่าอาจสร้างด้วยบริบทครบหรือไม่ครบก็ได้ ไม่มีทางรู้ย้อนหลัง
--           การเดาว่า 'bare' จะทำให้ขึ้นป้ายเตือนเท็จ จึงบอกตรงๆ ว่าไม่รู้
alter table lg_sub_requirements
  add column if not exists context_level text not null default 'unknown';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lg_sub_req_ctx_check') then
    alter table lg_sub_requirements
      add constraint lg_sub_req_ctx_check check (context_level in ('full','partial','bare','unknown'));
  end if;
end $$;

comment on column lg_sub_requirements.context_level is
  'บริบทที่ใช้ตอนแตกข้อย่อยครบแค่ไหน: full = มีสาระสำคัญ+คู่มือปฏิบัติ · partial = มีอย่างเดียว · bare = ตัวบทล้วน · unknown = แถวที่มีก่อน migration 055 (P25)';

commit;

-- DOWN
-- alter table lg_sub_requirements drop constraint if exists lg_sub_req_ctx_check;
-- alter table lg_sub_requirements drop column if exists context_level;
-- drop table if exists lg_law_gap;
