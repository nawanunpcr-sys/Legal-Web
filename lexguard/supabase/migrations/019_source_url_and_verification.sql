-- 019_source_url_and_verification.sql
-- (หมายเหตุ: โจทย์ระบุชื่อ 018 แต่ 018 ถูกใช้โดย assessment_workflow แล้ว จึงใช้ 019)
--
-- บริบท: หลัง AI ดึง+สรุปกฎหมายใหม่ ต้องมี "ผู้ตรวจสอบ" ตรวจทานว่า
--   (1) ดึงมาถูกฉบับ (2) สรุปถูกต้องตรงตัวบท (3) ครบถ้วนละเอียดพอ
-- ก่อน ADMIN จะกด "เพิ่มเข้าทะเบียน" เองเท่านั้น (ห้ามเข้าทะเบียนอัตโนมัติ)
-- ไม่เก็บไฟล์กฎหมายจริง — เก็บเป็น "ลิงก์ PDF/หน้าเว็บราชการ" (source_url) เพื่อกดเปิดต้นฉบับ

begin;

-- (1ก) ลิงก์ตัวบทจริงบนเว็บราชการ — ไม่เก็บไฟล์ในระบบ
--      (คอลัมน์นี้มีอยู่แล้วในฐานจริง — ใช้ if not exists กันพลาดตอน clone ที่ใหม่)
alter table lg_laws           add column if not exists source_url text;
alter table lg_import_staging add column if not exists source_url text;

-- (1ข) ฟิลด์ตรวจทานผลสรุปของ AI — เก็บที่ระดับ staging (ก่อนขึ้นเป็นกฎหมาย/flow)
--      หนึ่ง batch (cat, law_code) แชร์ค่าตรวจทานเดียวกันทุกแถว
alter table lg_import_staging add column if not exists verify_status   text default 'pending';  -- pending | passed | failed
alter table lg_import_staging add column if not exists verify_correct  boolean;   -- ดึงมาถูกฉบับ
alter table lg_import_staging add column if not exists verify_accurate boolean;   -- สรุปถูกต้องตรงตัวบท
alter table lg_import_staging add column if not exists verify_complete boolean;   -- แตกข้อกำหนดครบถ้วน ละเอียดพอ
alter table lg_import_staging add column if not exists verify_by       text;
alter table lg_import_staging add column if not exists verify_note     text;      -- สิ่งที่แก้ / เหตุผลกรณี failed
alter table lg_import_staging add column if not exists verified_at     timestamptz;

create index if not exists idx_lg_staging_verify on lg_import_staging(verify_status);

commit;
