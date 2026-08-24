-- 045 · P21 · ให้ผลการประเมินระดับกฎหมาย (lg_law_workflow) รับครบ 4 สถานะ
--
-- ตาราง lg_law_workflow เก็บ "ผลการทวนสอบ" ที่ผู้ประเมินกดจากฟอร์ม AssessForm
-- ซึ่งเป็นด่านเดียวกับที่พลิกสถานะข้อปฏิบัติทั้งฉบับผ่าน bulkSetReqStatus()
-- CHECK เดิมรับแค่ 2 ค่า จึงต้องขยายพร้อมกัน ไม่งั้นฟอร์มจะบันทึกไม่ผ่าน
-- ค่าที่นี่เป็นข้อความไทย (ต่างจาก lg_requirements.status ที่เป็นรหัสอังกฤษ) — คงรูปแบบเดิมไว้

alter table lg_law_workflow drop constraint if exists lg_law_workflow_assess_result_check;
alter table lg_law_workflow add constraint lg_law_workflow_assess_result_check
  check (assess_result = any (array['สอดคล้อง', 'ไม่สอดคล้อง', 'เพื่อทราบ', 'ไม่เกี่ยวข้อง']));

-- เหตุผลประกอบผลการประเมิน — บังคับกรอกเมื่อเป็น เพื่อทราบ / ไม่เกี่ยวข้อง
-- เก็บไว้ที่ระเบียนงานด้วย ไม่ใช่แค่กระจายลงข้อปฏิบัติ เพราะแฟ้มงานต้องอธิบายตัวเองได้
alter table lg_law_workflow add column if not exists assess_reason text;

alter table lg_law_workflow drop constraint if exists lg_law_workflow_assess_reason_check;
alter table lg_law_workflow add constraint lg_law_workflow_assess_reason_check
  check (assess_result is null
         or assess_result not in ('เพื่อทราบ', 'ไม่เกี่ยวข้อง')
         or (assess_reason is not null and btrim(assess_reason) <> ''));

comment on column lg_law_workflow.assess_result is
  'สอดคล้อง (C) | ไม่สอดคล้อง (NC) | เพื่อทราบ (Ack) | ไม่เกี่ยวข้อง (-) — P21';
comment on column lg_law_workflow.assess_reason is
  'เหตุผลประกอบผลการประเมิน — บังคับกรอกเมื่อ เพื่อทราบ / ไม่เกี่ยวข้อง (P21)';

-- DOWN
-- alter table lg_law_workflow drop constraint if exists lg_law_workflow_assess_reason_check;
-- alter table lg_law_workflow drop column if exists assess_reason;
-- alter table lg_law_workflow drop constraint if exists lg_law_workflow_assess_result_check;
-- alter table lg_law_workflow add constraint lg_law_workflow_assess_result_check
--   check (assess_result = any (array['สอดคล้อง', 'ไม่สอดคล้อง']));
