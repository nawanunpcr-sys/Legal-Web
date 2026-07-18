-- P11 · Phase C · เลิกใช้ tracker เก่า (lg_process_tracker / lg_process_items)
-- UI ใช้ lg_law_workflow (P10) เป็น source of truth เดียว — โค้ดฝั่ง client ลบออกแล้ว
-- ยังไม่ drop ตารางเพื่อกันข้อมูลย้อนหลัง; ปลอดภัยที่จะ drop หลังยืนยัน production 1 เดือน
comment on table lg_process_tracker is 'DEPRECATED (P11) — UI ใช้ lg_law_workflow (P10) เป็น source of truth. ปลอดภัยที่จะ drop หลังยืนยัน production 1 เดือน';
comment on table lg_process_items   is 'DEPRECATED (P11) — UI ใช้ lg_law_workflow (P10) เป็น source of truth. ปลอดภัยที่จะ drop หลังยืนยัน production 1 เดือน';
