-- 037 · เลขอ้างอิงราชกิจจานุเบกษา (เล่ม/ตอน/หน้า)
--
-- ปัญหา: ทะเบียนเก็บได้แค่ชื่อกฎหมายกับวันที่ประกาศ ซึ่งซ้ำกันได้หลายฉบับ
-- ผู้ตรวจ ISO 45001 ที่อยากเปิดต้นฉบับยืนยัน ต้องไปค้นเองจากชื่อ
-- "เล่ม 143 ตอนที่ 17 ก หน้า 4-7" คือตัวชี้ต้นฉบับที่แม่นที่สุดของกฎหมายไทย
-- และเป็นข้อมูลที่อยู่บนหัวกระดาษทุกหน้าของราชกิจจาฯ อยู่แล้ว (AI อ่านได้ทันที)
--
-- idempotent — รันซ้ำได้ไม่พัง

alter table lg_laws           add column if not exists gazette_ref text;
alter table lg_import_staging add column if not exists gazette_ref text;

comment on column lg_laws.gazette_ref is
  'เลขอ้างอิงราชกิจจานุเบกษา รูปแบบ "เล่ม <เล่ม> ตอนที่ <ตอน> <ประเภท> หน้า <หน้า>" เช่น เล่ม 143 ตอนที่ 17 ก หน้า 4-7';

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- alter table lg_import_staging drop column if exists gazette_ref;
-- alter table lg_laws           drop column if exists gazette_ref;
