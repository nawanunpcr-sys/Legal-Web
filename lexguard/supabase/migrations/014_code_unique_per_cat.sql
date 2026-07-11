-- รหัสกฎหมายซ้ำข้ามหมวดได้ (unique ต่อหมวด ไม่ใช่ต่อทั้งตาราง)
--
-- เหตุผล: ทะเบียนจริงของบริษัท (F-259) มีรหัส LF-001 ถึง LF-039 ถูกใช้พร้อมกันใน
-- 2 หมวด คือ หมวด LF (Service) และหมวด LG (คณะกรรมการสวัสดิการ) ซึ่งเป็นกฎหมาย
-- คนละฉบับที่บังเอิญใช้เลขชนกัน เราตัดสินใจ "คงรหัสตามเอกสารจริง" ห้ามเปลี่ยนเลข
-- ดังนั้น unique เดิมบนคอลัมน์ code เดี่ยวๆ จึงใช้ไม่ได้ ต้องเปลี่ยนเป็น unique (cat, code)
--
-- ผลลัพธ์: code ยังต้องไม่ซ้ำ "ภายในหมวดเดียวกัน" แต่ซ้ำข้ามหมวดได้
-- โค้ดฝั่งแอปที่ lookup กฎหมายจาก code ถูกแก้ให้ระบุ cat ประกอบเสมอ (ดู addStagedLaw ใน src/lib/supabase.js)

-- 1) ลบ unique constraint เดิมบน lg_laws.code
--    (constraint ที่เกิดจาก `code text unique` ใน schema.sql มีชื่ออัตโนมัติว่า lg_laws_code_key)
alter table lg_laws drop constraint if exists lg_laws_code_key;

-- 2) สร้าง unique constraint ใหม่บน (cat, code)
alter table lg_laws add constraint lg_laws_cat_code_key unique (cat, code);
