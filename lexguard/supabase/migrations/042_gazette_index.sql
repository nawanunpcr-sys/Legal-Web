-- 042 · ดัชนีราชกิจจานุเบกษาของเราเอง — เลิกเดา URL ตัวบทจาก web_search
--
-- ปัญหาที่แก้: Skill 3 หา "ตัวบทของกฎหมายที่ถูกอ้างถึง" ด้วย web_search อย่างเดียว
-- ซึ่งพังสองทางพร้อมกัน
--   1. ดัชนีของ search engine ยังคืนที่อยู่ราชกิจจาฯ แบบเก่า /DATA/PDF/... อยู่เรื่อย ๆ
--      ที่อยู่นั้นตายแล้ว (ยิงจริง 2026-08-22 ได้ 403 Cloudflare challenge) = เสียคำขอฟรี
--   2. การ recheck ว่า "ประกาศออกตามข้อนี้ออกมาแล้วหรือยัง" ต้องเสีย 1 คำขอ AI ต่อ 1 จุด
--      จุด pending จึงตกโควตาเป็นประจำ แล้วคืนคำตอบว่า "ยังไม่ยืนยัน" ทั้งที่ประกาศออกแล้ว
--
-- เว็บราชกิจจาฯ ค้นเองไม่ได้ — ทุก path ยกเว้น /documents/<id>.pdf ติด Cloudflare
-- (ตรวจ 2026-08-22: / · /search · /api/search · /robots.txt · /sitemap.xml = 403 ทั้งหมด)
-- แต่ สลค. เปิดข้อมูลชุดเดียวกันไว้ 2 ทาง ซึ่งไม่มี Cloudflare ขวาง:
--   ก) dump JSON รายเดือนบน soc.gdcatalog.go.th (ฟรี ไม่ต้องใช้ token) มิ.ย. 2566 เป็นต้นมา
--   ข) api.soc.go.th/webservice/api/rkjs/... (ต้องมี Bearer Token · ย้อนได้ทั้งคลัง)
-- ตารางนี้รองรับทั้งสองทาง — คอลัมน์ source บอกว่าแถวนั้นมาจากทางไหน
--
-- ที่สำคัญที่สุด: ฟิลด์ URL ใน dump เป็นรูปแบบ /documents/<id>.pdf ครบ 100%
-- ซึ่งเป็นที่อยู่เดียวที่ยังเปิดได้จริง — ดัชนีนี้จึงการันตีลิงก์เป็น ไม่ใช่เดาเอา
--
-- ดัชนีนี้มีแค่ "ชื่อเรื่อง" ไม่มีเนื้อหาข้างใน · ใช้หาว่าฉบับไหนมีอยู่และอยู่ที่ไหน
-- ส่วนการอ่านเนื้อหาเพื่อตอบคำถามยังเป็นงานของ AI เหมือนเดิม ด่านตรวจไม่ผ่อนสักด่าน
--
-- idempotent · รันซ้ำได้

-- pg_trgm ทำให้ ilike '%...%' ใช้ index ได้ · ภาษาไทยไม่เว้นวรรค ค้นแบบ full-text ไม่เวิร์ก
-- ต้องค้นด้วย substring บนข้อความที่ตัดช่องว่างทิ้งแล้ว trigram จึงเป็นทางที่ตรงที่สุด
create extension if not exists pg_trgm;

create table if not exists lg_gazette_index (
  id           bigserial primary key,
  doc_url      text not null unique,      -- https://ratchakitcha.soc.go.th/documents/<id>.pdf
  title        text not null,             -- ชื่อเรื่องตามที่ประกาศ (ไว้แสดงให้ผู้ใช้เห็น)
  title_norm   text not null,             -- ตัดช่องว่าง + เลขไทย→อารบิก + lower — ช่องที่ใช้ค้นจริง
  doc_type     text,                      -- ก (กฤษฎีกา) · ข · ค · ง (ประกาศทั่วไป) · "ง พิเศษ"
  book_no      int,                       -- เล่ม
  part         text,                      -- ตอน (เก็บเป็น text เพราะมี "พิเศษ" ปนมา)
  page_no      int,                       -- หน้า
  publish_date date,                      -- วันที่ประกาศในราชกิจจานุเบกษา
  source       text not null default 'gdcatalog',   -- gdcatalog | soc_api
  loaded_at    timestamptz not null default now()
);

alter table lg_gazette_index drop constraint if exists lg_gazette_index_source_check;
alter table lg_gazette_index add constraint lg_gazette_index_source_check
  check (source in ('gdcatalog','soc_api'));

-- ค้นหลัก: title_norm ilike '%เข็มค้น%' → ต้องเป็น gin_trgm_ops ไม่ใช่ btree
create index if not exists lg_gazette_index_title_trgm
  on lg_gazette_index using gin (title_norm gin_trgm_ops);

-- เรียงผลลัพธ์เอาฉบับใหม่ก่อนเสมอ (ประกาศฉบับหลังมักแทนที่ฉบับก่อน)
create index if not exists lg_gazette_index_date_idx
  on lg_gazette_index (publish_date desc);

-- กรองเฉพาะประเภท ก เวลาอยากได้ตัวบทกฎหมายล้วน
create index if not exists lg_gazette_index_type_idx
  on lg_gazette_index (doc_type, publish_date desc);

-- RLS · ดัชนีสาธารณะ ไม่มีข้อมูลของผู้ใช้ เหมือน lg_ref_answers / lg_law_refs
alter table lg_gazette_index enable row level security;
drop policy if exists lg_gazette_index_read on lg_gazette_index;
create policy lg_gazette_index_read on lg_gazette_index for all using (true) with check (true);

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- drop table if exists lg_gazette_index;
