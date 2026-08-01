-- P18 (superseded) · เดิมตั้งใจเพิ่มสถานะ 'pending' ให้ lg_requirements/lg_laws
-- แต่เปลี่ยนแนวทางตามที่ตกลง: ไม่เพิ่มค่าสถานะใหม่ในฐานข้อมูล — ยังมีแค่ met/unmet เหมือนเดิม
-- ตัวแยกว่า "ประเมินแล้วหรือยัง" คือ evaluated_at เป็น NULL หรือไม่
-- และ "รอผู้เกี่ยวข้องประเมิน" ระบุเพิ่มด้วย note ที่ขึ้นต้นว่า 'รอผู้เกี่ยวข้องประเมิน:'
--
-- คงชื่อไฟล์ให้ตรงกับ migration ที่ apply ไปแล้ว — เนื้อหาปัจจุบัน = คืน default เป็น 'met' (ไม่มี schema change สุทธิ)

alter table lg_requirements alter column status set default 'met';

comment on column lg_requirements.status is
  'met | unmet — "ยังไม่ประเมิน" ระบุด้วย evaluated_at IS NULL + note รอผู้เกี่ยวข้องประเมิน (P18)';
comment on column lg_laws.status is 'ok | bad | repealed';

-- DOWN
-- (ไม่มี schema change ให้ย้อน — default เดิมคือ 'met' อยู่แล้ว)
