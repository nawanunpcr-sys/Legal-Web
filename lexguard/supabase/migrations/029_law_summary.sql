-- P12 · หน้า "สรุปกฎหมาย" — pipeline เดียว (lg_ai_discovered_laws) + คลังสรุป AI ย้อนหลัง
-- idempotent ทุกจุด

-- Phase A · เก็บผลสรุป AI เต็ม ({law, requirements}) ไว้ prefill เข้าทะเบียน
alter table lg_ai_discovered_laws add column if not exists ai_payload jsonb;

-- Phase B · AI สรุปย้อนหลังของกฎหมายในทะเบียน (ไม่ทับ requirements ที่ยืนยันแล้ว)
alter table lg_laws add column if not exists ai_summary jsonb;
alter table lg_laws add column if not exists ai_summary_at timestamptz;

-- Phase C · เลิกใช้ staging เดิม — pipeline เดียวคือ lg_ai_discovered_laws
comment on table lg_import_staging is 'DEPRECATED (P12) — pipeline เดียวคือ lg_ai_discovered_laws. drop ได้หลังยืนยัน production';
