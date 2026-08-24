-- 044 · P21 · ขยายผลการประเมินข้อปฏิบัติจาก 2 สถานะ เป็น 4 สถานะ
--
-- สถานะที่ระบบรองรับหลังจากนี้ (ค่าใน lg_requirements.status)
--   met            C   สอดคล้อง        ปฏิบัติครบถ้วนตามข้อกำหนด
--   unmet          NC  ไม่สอดคล้อง     ยังปฏิบัติไม่ครบถ้วน ต้องแก้ไข
--   acknowledged   Ack เพื่อทราบ        ไม่ต้องดำเนินการ แต่ต้องรับทราบและเฝ้าระวัง
--   not_applicable -   ไม่เกี่ยวข้อง     ไม่เข้าข่ายลักษณะกิจการหรือกิจกรรมขององค์กร
--
-- คงค่าเดิม met/unmet ไว้ตามที่ตกลง (ไม่เปลี่ยนเป็น compliant/non_compliant)
-- เพื่อไม่ต้องแตะข้อมูล 575 แถวและโค้ดที่อ้างค่าเดิมกว่า 40 จุด
-- รหัสย่อ C / NC / Ack / - แสดงที่ชั้น UI และไฟล์ export เท่านั้น
--
-- ฐานคำนวณอัตราความสอดคล้อง = C + NC · Ack และ ไม่เกี่ยวข้อง ถูกตัดออกจากตัวหาร

-- ── ขั้น 0 · สำรองทั้งตารางก่อนแตะข้อมูล ──────────────────────────────────────
create table if not exists lg_requirements_bak_20260824 as select * from lg_requirements;
alter table lg_requirements_bak_20260824 enable row level security;
comment on table lg_requirements_bak_20260824 is
  'สำรองก่อน migration 044 (P21 · 4 สถานะ) — เปิด RLS ไม่มี policy = อ่านผ่าน API ไม่ได้ กู้ได้จาก Dashboard';

-- ── ขั้น 1 · backfill evaluated_at ให้ผลประเมินเดิม ──────────────────────────
-- ก่อน migration นี้ 573 จาก 575 แถวมี evaluated_at เป็น NULL ทั้งที่ถูกใช้เป็น
-- ผลประเมินจริงมาตลอด (ค่ามาจากไฟล์ F-259 ที่นำเข้าครั้งแรก ซึ่งไม่ได้บันทึกเวลาไว้)
-- กฎใหม่ "evaluated_at IS NULL = ยังไม่ประเมิน" จึงจะทำให้ผลเดิมหายไปทั้งหมด
-- และฐาน KPI เหลือ 3 ข้อ · ตีตราเวลาให้เท่ากับวันที่บันทึกกฎหมายฉบับนั้นเข้าทะเบียน
-- ซึ่งเป็นเวลาที่ใกล้ความจริงที่สุดเท่าที่ข้อมูลมี และทำเครื่องหมายผู้ประเมินไว้ให้สอบกลับได้
-- lg_requirements ไม่มีคอลัมน์ created_at/updated_at จึงต้องอ้างจากกฎหมายแม่
update lg_requirements r
   set evaluated_at = l.created_at,
       evaluated_by = coalesce(nullif(btrim(r.evaluated_by), ''), 'ข้อมูลเดิมก่อนปรับระบบ (P21)')
  from lg_laws l
 where r.law_id = l.id
   and r.evaluated_at is null;

-- แถวกำพร้า (law_id เป็น NULL หรือชี้ไปกฎหมายที่ไม่มีแล้ว) — ไม่มีวันที่ให้อ้างเลย
update lg_requirements
   set evaluated_at = timestamptz '2026-08-24 00:00:00+07',
       evaluated_by = coalesce(nullif(btrim(evaluated_by), ''), 'ข้อมูลเดิมก่อนปรับระบบ (P21)')
 where evaluated_at is null;

-- ── ขั้น 2 · เหตุผลประกอบสถานะ ───────────────────────────────────────────────
-- แยกจาก note โดยตั้งใจ — note ถูกใช้เป็นตัวบ่งชี้ "รอผู้เกี่ยวข้องประเมิน" มาตั้งแต่ P18
-- เอาสองความหมายมาปนในคอลัมน์เดียวจะทำให้ตัวแยกสถานะเดิมพัง
alter table lg_requirements add column if not exists status_reason text;

-- ── ขั้น 3 · จำกัดค่าที่อนุญาต ───────────────────────────────────────────────
-- ก่อนหน้านี้คอลัมน์ status ไม่มี CHECK เลย (พิมพ์ค่าอะไรลงไปก็ได้)
alter table lg_requirements drop constraint if exists lg_requirements_status_check;
alter table lg_requirements add constraint lg_requirements_status_check
  check (status in ('met', 'unmet', 'acknowledged', 'not_applicable'));

-- ── ขั้น 4 · บังคับเหตุผลฝั่ง server ─────────────────────────────────────────
-- RLS ของตารางนี้เป็น FOR ALL USING(true) WITH CHECK(true) จึงบังคับกติกาอะไรไม่ได้
-- และแอปยิงด้วย anon key ตรงเข้า PostgREST · ด่านฝั่ง server ที่แท้จริงจึงมีแค่ CHECK นี้
alter table lg_requirements drop constraint if exists lg_requirements_status_reason_check;
alter table lg_requirements add constraint lg_requirements_status_reason_check
  check (status not in ('acknowledged', 'not_applicable')
         or (status_reason is not null and btrim(status_reason) <> ''));

comment on column lg_requirements.status is
  'met (C สอดคล้อง) | unmet (NC ไม่สอดคล้อง) | acknowledged (Ack เพื่อทราบ) | not_applicable (- ไม่เกี่ยวข้อง) — P21 · "ยังไม่ประเมิน" ยังระบุด้วย evaluated_at IS NULL + note รอผู้เกี่ยวข้องประเมิน';
comment on column lg_requirements.status_reason is
  'เหตุผลประกอบสถานะ — บังคับกรอกเมื่อ acknowledged / not_applicable (P21)';

-- DOWN
-- alter table lg_requirements drop constraint if exists lg_requirements_status_reason_check;
-- alter table lg_requirements drop constraint if exists lg_requirements_status_check;
-- alter table lg_requirements drop column if exists status_reason;
-- update lg_requirements set evaluated_at = null, evaluated_by = null
--  where evaluated_by = 'ข้อมูลเดิมก่อนปรับระบบ (P21)';
