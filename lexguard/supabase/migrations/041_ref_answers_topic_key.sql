-- 041 · คีย์รองของ cache คำตอบ — ให้คำถามคนละสำนวนใช้คำตอบเดิมได้
--
-- ปัญหาที่แก้: lg_ref_answers ผูกกับ question_key ซึ่ง normalize มาจาก "ตัวอักษรของคำถาม"
-- แต่คำถามถูกโมเดลเรียบเรียงใหม่ทุกรอบ สำนวนจึงไม่เคยตรงกันเป๊ะ
--   รอบ 1: "อาคารสำนักงานต้องมีที่ถ่ายอุจจาระ ที่ถ่ายปัสสาวะ อ่างล้างมือ อย่างละกี่ที่ ต่อพื้นที่เท่าไร"
--   รอบ 2: "สำนักงานต้องจัดห้องน้ำห้องส้วมกี่ที่ ต่อพื้นที่อาคารกี่ตารางเมตร"
-- คนละ key ทั้งที่เป็นคำถามเดียวกัน → จ่ายค่า web_search + อ่านไฟล์ซ้ำเพื่อได้คำตอบเดิม
--
-- ของใหม่: topic_key = (ชื่อกฎหมายที่อ้างถึง normalize แล้ว) + '|' + (เรื่องที่ถาม)
-- "เรื่อง" มาจากตารางคำที่คุมเองใน ref-classify.js ไม่ใช่การตัดคำอัตโนมัติ
-- และออกคีย์เฉพาะเมื่อคำถามเข้าเรื่องเดียว — คร่อม 2 เรื่องหรือไม่เข้าเลย = ไม่ออกคีย์ ค้นใหม่ตามเดิม
--
-- ไม่ unique โดยตั้งใจ: หลายแถวใช้ topic_key เดียวกันได้ (คนละสำนวน) อ่านเอาแถวล่าสุดที่ answered
-- การอ่านข้ามสำนวนรับเฉพาะ status='answered' ที่มี source_excerpt เท่านั้น (บังคับในโค้ด)
-- เพราะ not_answered ขึ้นกับสำนวนที่ใช้ค้น เปลี่ยนคำถามแล้วอาจเจอ
--
-- idempotent · รันซ้ำได้

alter table lg_ref_answers add column if not exists topic_key text;

-- อ่านด้วย topic_key + status + เรียงตามความใหม่ → index ครอบทั้งสามคอลัมน์
create index if not exists lg_ref_answers_topic_idx
  on lg_ref_answers (topic_key, status, resolved_at desc)
  where topic_key is not null;

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- drop index if exists lg_ref_answers_topic_idx;
-- alter table lg_ref_answers drop column if exists topic_key;
