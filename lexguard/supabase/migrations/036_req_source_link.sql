-- 036 · Skill 3 · ที่มาของข้อปฏิบัติต้องไปถึงทะเบียนจริง (lg_requirements)
--
-- ปัญหา: ข้อที่ดึงมาจาก "กฎหมายที่ถูกอ้างถึง" ติดที่มามาครบตั้งแต่ osh-law-relate.js
-- (from_related_law / from_law_url / from_law_confidence) และหน้าสรุปกฎหมายก็แสดง badge ถูก
-- แต่พออนุมัติเข้าทะเบียน เหลือแต่ชื่อกฎหมายต้นทาง (from_related_law จาก 034) — ไม่มีลิงก์ตัวบท
-- ผู้ตรวจ ISO 45001 เปิด F-259 เห็นข้อปฏิบัติที่ไม่มีในตัวบทของกฎหมายฉบับนั้น แล้วหาที่มาไม่ได้
--
-- idempotent — รันซ้ำได้ไม่พัง

alter table lg_requirements add column if not exists from_law_url text;
alter table lg_requirements add column if not exists from_law_confidence text;

comment on column lg_requirements.from_related_law is
  'Skill 3 · ชื่อกฎหมายต้นทางที่ข้อนี้ถูกดึงมา · null = ข้อของกฎหมายฉบับหลักเอง';
comment on column lg_requirements.from_law_url is
  'Skill 3 · ลิงก์ไฟล์ตัวบทของกฎหมายต้นทาง (โดเมนที่เชื่อถือได้เท่านั้น) — ให้ผู้ตรวจเปิดตรวจเองได้';
comment on column lg_requirements.from_law_confidence is
  'Skill 3 · ระดับความมั่นใจของการดึงตัวบท: high | medium | low — ที่ไม่ใช่ high ต้องเตือนให้ตรวจตัวบทเอง';

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- alter table lg_requirements drop column if exists from_law_confidence;
-- alter table lg_requirements drop column if exists from_law_url;
