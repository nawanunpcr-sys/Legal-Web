-- 032 · แก้ constraint และ RLS ที่ทำให้ 3 ฟีเจอร์บันทึกข้อมูลไม่ได้ + ปิดช่องข้อมูลรั่ว
-- รันบน production ไปแล้วเมื่อ 2026-08-09 ผ่าน Supabase MCP (ชื่อ migration ตามหัวข้อย่อยด้านล่าง)
-- เก็บไฟล์นี้ไว้ให้ประวัติในรีโปตรงกับฐานจริง

-- ── 032a · allow_ai_source_on_discovered_laws ──────────────────────────────
-- หน้า "สรุปกฎหมาย" ส่ง source='ai' แต่ constraint เดิมรับแค่ค่าจากยุค Discovery ก่อน P12
-- อาการ: ปุ่ม "เก็บลงคิวไว้ก่อน" ขึ้น error ตลอด (ตารางมี 0 แถว)
ALTER TABLE lg_ai_discovered_laws DROP CONSTRAINT lg_ai_discovered_laws_source_check;
ALTER TABLE lg_ai_discovered_laws ADD CONSTRAINT lg_ai_discovered_laws_source_check
  CHECK (source = ANY (ARRAY['ratchakitcha'::text, 'shawpat'::text, 'manual'::text, 'ai'::text]));

-- ── 032b · allow_law_and_assess_ref_type_on_attachments ────────────────────
-- constraint เดิมมาจากยุคที่แนบไฟล์ได้แค่ CAR/report/comm
-- แต่ UI ส่ง 'law' (AddLawFlow, CaseParts) และ 'assess' (AssessForm) ด้วย
ALTER TABLE lg_attachments DROP CONSTRAINT lg_attachments_ref_type_check;
ALTER TABLE lg_attachments ADD CONSTRAINT lg_attachments_ref_type_check
  CHECK (ref_type = ANY (ARRAY['car'::text, 'report'::text, 'comm'::text, 'law'::text, 'assess'::text]));

-- ── 032c · align_attachments_and_review_log_policy_roles ───────────────────
-- policy ของ 2 ตารางนี้ผูกกับ role 'authenticated' ต่างจากตารางอื่นทั้งระบบที่เป็น PUBLIC
-- แต่แอปยังอยู่โหมด demo (auth.js: AUTH_MODE='demo') ยิงด้วย anon key = role anon จึงถูกปฏิเสธ
-- TODO(production): เมื่อย้ายไป Supabase Auth จริง ให้รัดกลับเป็น authenticated พร้อมกันทั้งระบบ
DROP POLICY lg_attachments_all ON lg_attachments;
CREATE POLICY lg_attachments_all ON lg_attachments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY lg_review_log_all ON lg_review_log;
CREATE POLICY lg_review_log_all ON lg_review_log FOR ALL USING (true) WITH CHECK (true);

-- ── 032d · enable_rls_on_backup_tables ─────────────────────────────────────
-- ตารางสำรองจาก migration เก่าไม่ได้เปิด RLS → PostgREST เปิดให้ anon อ่านได้ทั้งหมด (855 แถว)
-- Supabase advisor: rls_disabled_in_public ระดับ ERROR x6
-- เปิด RLS โดยไม่สร้าง policy = เข้าถึงผ่าน API ไม่ได้ แต่ข้อมูลยังอยู่ กู้ได้จาก Dashboard
ALTER TABLE lg_requirements_bak_20260717     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lg_laws_datebackup_20260721      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lg_requirements_ccsbak_20260731  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lg_laws_ccsbak_20260731          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lg_laws_datefix_bak_20260731     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lg_categories_ccsbak_20260731    ENABLE ROW LEVEL SECURITY;
