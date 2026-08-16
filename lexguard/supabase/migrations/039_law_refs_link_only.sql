-- 039 · เพิ่มสถานะ link_only — "สรุปเป็นข้อความไม่ได้ แต่รู้ว่าตัวบทอยู่ที่ไหน"
--
-- ที่มา: กฎหมายบางฉบับใหญ่เกินกว่าจะสรุปจบ อ่านไม่ออก หรือแหล่งที่ค้นเจอไม่อยู่ในโดเมนที่เชื่อถือได้
-- เดิมกรณีพวกนี้กลายเป็น not_found ทั้งหมด ผู้ใช้ไม่ได้อะไรเลยแม้ระบบจะรู้ URL ของตัวบทอยู่แล้ว
-- ตอนนี้เก็บลิงก์ไว้ให้ จป. เปิดอ่านเอง ซึ่งดีกว่าไม่ให้อะไร
--
-- พร้อมกันนี้แก้บั๊ก: เดิมถ้าโมเดลตอบ status:'not_found' มา บล็อกตรวจทั้งหมดถูกข้าม
-- สถานะจึงค้างที่ not_found ทั้งที่มี explain + explain_excerpt เก็บไว้แล้ว
-- (เจอจริงกับ พ.ร.บ.วัตถุอันตราย 2535) ทำให้เนื้อหาที่จ่ายเงินดึงมาไม่เคยถูกใช้
-- ตอนนี้สรุปสถานะจาก "หลักฐานที่เหลือ" ไม่ใช่จากป้ายที่โมเดลติดมา
--
-- idempotent · รันซ้ำได้

alter table lg_law_refs drop constraint if exists lg_law_refs_resolve_status_check;
alter table lg_law_refs add constraint lg_law_refs_resolve_status_check
  check (resolve_status in ('resolved','not_found','manual','explained','link_only'));

-- แถวเดิมที่เป็น not_found ทั้งที่มีคำอธิบายและลิงก์อยู่แล้ว — เลื่อนให้ตรงความจริง
-- เพื่อให้ cache รอบหน้าเอาไปใช้ได้เลย ไม่ต้องจ่ายเงินดึงใหม่
update lg_law_refs
   set resolve_status = 'explained'
 where resolve_status = 'not_found'
   and coalesce(explain,'') <> '';

update lg_law_refs
   set resolve_status = 'link_only'
 where resolve_status = 'not_found'
   and coalesce(explain,'') = ''
   and coalesce(source_url,'') <> '';

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- update lg_law_refs set resolve_status = 'not_found' where resolve_status = 'link_only';
-- alter table lg_law_refs drop constraint if exists lg_law_refs_resolve_status_check;
-- alter table lg_law_refs add constraint lg_law_refs_resolve_status_check
--   check (resolve_status in ('resolved','not_found','manual','explained'));
