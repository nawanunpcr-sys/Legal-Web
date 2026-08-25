-- 051 · P22 · แก้ CHECK ที่ทำให้ "ให้ AI คัดกรองใหม่" ล้มเมื่อฉบับนั้นถูกยืนยันไปแล้ว
--
-- ═══ อาการ ═══
-- lg_law_relevance_disagree_needs_note_check เดิมเทียบ confirmed_verdict กับ verdict
-- ซึ่ง verdict คือ "ข้อเสนอล่าสุดของ AI" ที่เปลี่ยนได้ทุกครั้งที่กดคัดกรองใหม่
-- ลำดับที่ทำให้พัง (ทดสอบยืนยันแล้วบน production):
--   1. AI เสนอ relevant → คนยืนยัน relevant (ตรงกัน จึงไม่ต้องมีเหตุผล · confirm_note = null)
--   2. ผู้ใช้แก้บริบทองค์กร แล้วกด "ให้ AI คัดกรองใหม่"
--   3. AI เปลี่ยนใจเป็น not_relevant → UPDATE ทำให้ confirmed_verdict('relevant')
--      ต่างจาก verdict('not_relevant') ทั้งที่ confirm_note ว่าง → ชน CHECK
--   4. endpoint ตอบ "บันทึกผลคัดกรองไม่สำเร็จ" ทุกครั้ง แก้ไม่ได้จากหน้าจอ
-- และนี่คือจังหวะที่ผู้ใช้อยากคัดกรองใหม่มากที่สุดพอดี (หลังแก้โปรไฟล์)
--
-- ═══ ทางแก้ ═══
-- เจตนาของ CHECK คือ "คนที่ไม่เห็นด้วยกับ AI ต้องเขียนเหตุผล"
-- ตัวเทียบจึงต้องเป็น "AI เสนออะไรไว้ ณ เวลาที่คนตัดสิน" ซึ่งเป็นค่าที่ไม่เปลี่ยนอีก
-- ไม่ใช่ "AI เสนออะไรอยู่ตอนนี้" ซึ่งเปลี่ยนได้ตลอด
-- เพิ่มคอลัมน์ confirmed_against_verdict เก็บค่านั้นไว้ แล้วให้ CHECK เทียบกับคอลัมน์นี้แทน
--
-- ═══ กติกาข้อ 9 ═══
-- เพิ่มคอลัมน์ใหม่ + เปลี่ยน CHECK (DDL) เท่านั้น
-- ไม่มี UPDATE ไม่มี DELETE · ตารางนี้มี 0 แถวใน production จึงไม่มีข้อมูลเดิมให้ backfill

begin;

alter table lg_law_relevance add column if not exists confirmed_against_verdict text;

comment on column lg_law_relevance.confirmed_against_verdict is
  'ข้อเสนอของ AI ณ เวลาที่คนกดยืนยัน — ค่านี้ไม่เปลี่ยนอีกแม้จะคัดกรองใหม่ ใช้เป็นตัวเทียบว่าคน "เห็นต่าง" หรือไม่ (P22 · migration 051)';

alter table lg_law_relevance drop constraint if exists lg_law_relevance_disagree_needs_note_check;
alter table lg_law_relevance add constraint lg_law_relevance_disagree_needs_note_check
  check (confirmed_verdict is null
         or confirmed_against_verdict is null            -- ข้อมูลเก่าที่ไม่ได้เก็บค่านี้ไว้ ไม่ย้อนไปบังคับ
         or confirmed_verdict = confirmed_against_verdict
         or (confirm_note is not null and btrim(confirm_note) <> ''));

commit;

-- DOWN
-- alter table lg_law_relevance drop constraint if exists lg_law_relevance_disagree_needs_note_check;
-- alter table lg_law_relevance add constraint lg_law_relevance_disagree_needs_note_check
--   check (confirmed_verdict is null or confirmed_verdict = verdict
--          or (confirm_note is not null and btrim(confirm_note) <> ''));
-- alter table lg_law_relevance drop column if exists confirmed_against_verdict;
