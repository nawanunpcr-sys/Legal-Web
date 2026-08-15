-- 038 · Skill 3 เปลี่ยนเป้าหมายหลัก: จาก "หาข้อที่บริษัทต้องทำ" เป็น "อธิบายสาระของมาตราที่ถูกอ้างถึง"
--
-- ที่มา: ข้อของกฎหมายฉบับหลักมักลงท้ายว่า "...ตามมาตรา 3 โสฬส แห่งประมวลรัษฎากร"
-- ผู้อ่าน (จป.) อ่านแล้วยังไม่รู้ว่าต้องทำอะไร ต้องไปเปิดประมวลรัษฎากรเอง
-- ซึ่งคือปัญหาที่ระบบตั้งใจแก้ตั้งแต่แรก
--
-- เดิมถ้ามาตราที่ถูกอ้างเป็น "บทให้อำนาจ" (ไม่สั่งให้บริษัททำอะไร) ระบบจะทิ้งเนื้อหาทั้งก้อน
-- แล้วขึ้นว่า "หาตัวบทไม่พบ" ทั้งที่อ่านเจอ — เนื้อหาที่จ่ายเงินดึงมาจึงไม่เคยถูกใช้
--
-- 1) explain = สาระของมาตรานั้นเป็นภาษาที่คนทั่วไปเข้าใจ (ต้องมีเสมอ ไม่ว่าจะมีหน้าที่หรือไม่)
--    ระบบเอาไปเขียนแทนคำว่า "ตามมาตรา X" ในข้อของฉบับหลัก ให้อ่านจบในตัว
-- 2) สถานะ explained = อ่านตัวบทได้ ได้คำอธิบาย แต่ไม่มีข้อที่บริษัทต้องทำ (ไม่ใช่ความล้มเหลว)
--    ต้องเพิ่มเข้า constraint ไม่งั้นการเขียน cache ล้ม (ถูก try/catch กลืน) แล้วดึงซ้ำทุกครั้ง
--
-- idempotent · รันซ้ำได้

alter table lg_law_refs add column if not exists explain text;

alter table lg_law_refs drop constraint if exists lg_law_refs_resolve_status_check;
alter table lg_law_refs add constraint lg_law_refs_resolve_status_check
  check (resolve_status in ('resolved','not_found','manual','explained'));

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- update lg_law_refs set resolve_status = 'not_found' where resolve_status = 'explained';
-- alter table lg_law_refs drop constraint if exists lg_law_refs_resolve_status_check;
-- alter table lg_law_refs add constraint lg_law_refs_resolve_status_check
--   check (resolve_status in ('resolved','not_found','manual'));
-- alter table lg_law_refs drop column if exists explain;
