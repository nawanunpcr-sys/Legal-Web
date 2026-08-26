-- 052 · P22 · กู้ข้อมูล 4 คอลัมน์จาก F-259 ที่ไม่เคยเข้าฐาน
--
-- ═══ ปัญหา (docs/f259-mapping.md ข้อ 3.1) ═══
-- ทีมงานกรอก ผู้รับผิดชอบ / ความถี่การตรวจสอบ / เอกสารที่เกี่ยวข้อง / การรายงานผล
-- ไว้ในไฟล์ F-259 รวม 1,153 ค่า แต่เข้าฐานจริงเพียง 96 ค่า
-- เพราะ migration 017 ตั้งกฎว่า "insert ข้อกำหนดเฉพาะกฎหมายที่ยังไม่มีข้อกำหนดในฐาน"
-- กฎหมายส่วนใหญ่มีข้อกำหนดอยู่ก่อนแล้ว ทั้งสี่คอลัมน์จึงถูกข้ามไปเงียบๆ
-- นี่คือเหตุผลตรงๆ ที่ผู้ประเมินบอกว่า "ระบบไม่มีสรุปว่าองค์กรต้องดำเนินการอะไร"
--
-- ═══ ทำไมเป็นตารางแยก ไม่ UPDATE ทับ ═══
-- กติกา 9.2/9.3 ห้าม UPDATE แถวเดิมของ lg_requirements และห้าม migration มีคำสั่ง UPDATE
-- ตารางนี้เก็บ "ค่าที่เอกสารต้นฉบับบอกไว้" แยกจาก "ค่าที่ผู้ใช้กรอกในระบบ"
-- แล้วให้ view รวมให้ตอนอ่าน (กติกา 9.6) — ค่าที่คนกรอกในระบบชนะเสมอ
-- ผลพลอยได้: ตอบผู้ตรวจได้ว่าค่านี้มาจากไหน แถวไหนของไฟล์ไหน ซึ่งการ UPDATE ทับทำไม่ได้
--
-- ═══ อัตราการจับคู่ (วัดจริงก่อนออกแบบ) ═══
-- 304 แถวที่มีข้อมูลให้เติม (ไม่นับหมวด CCS ที่ถูกถอดจากแอปแล้ว)
--   ตรงเป๊ะ 278 (91%) · บางส่วน 9 (3%) · จับคู่ไม่ได้ 17 (6%)
-- แถวที่จับคู่ไม่ได้ยังเก็บไว้ (requirement_id = null) เพื่อให้คนมาไล่ดูเองได้
-- ไม่ทิ้งเงียบๆ เพราะ 6% ที่หายไปคือสิ่งที่ไม่มีใครรู้ว่าหาย

begin;

create table if not exists lg_req_f259_source (
  id             bigint generated always as identity primary key,
  requirement_id bigint references lg_requirements(id) on delete cascade,   -- null = จับคู่ไม่ได้
  law_id         bigint references lg_laws(id) on delete cascade,

  -- ที่มาในเอกสารต้นฉบับ — ต้องย้อนกลับไปเปิดไฟล์ที่แถวเดิมได้
  cat            text,
  law_code       text,
  source_sheet   text,
  source_row     int,
  req_excerpt    text,          -- 200 ตัวอักษรแรกของสาระสำคัญ ใช้ไล่หาแถวที่จับคู่ไม่ได้

  -- 4 คอลัมน์ที่กู้มา (ชื่อตามหัวตารางจริงใน F-259)
  responsible    text,          -- หน่วยงาน/ผู้รับผิดชอบ
  frequency      text,          -- ความถี่การตรวจสอบ
  documents      text,          -- เอกสารที่เกี่ยวข้อง
  report_to      text,          -- การรายงานผล
  remark         text,          -- หมายเหตุ : กรณีไม่สอดคล้อง

  match_kind     text not null default 'unmatched',
  imported_at    timestamptz not null default now(),
  imported_by    text,

  constraint lg_req_f259_match_check check (match_kind in ('exact','partial','unmatched')),
  -- จับคู่ได้ต้องมี requirement_id · จับคู่ไม่ได้ต้องไม่มี — กันสถานะกำกวม
  constraint lg_req_f259_link_check
    check ((match_kind = 'unmatched') = (requirement_id is null))
);

create index if not exists lg_req_f259_req_idx  on lg_req_f259_source(requirement_id);
create index if not exists lg_req_f259_law_idx  on lg_req_f259_source(law_id);
create unique index if not exists lg_req_f259_uniq on lg_req_f259_source(source_sheet, source_row);

comment on table lg_req_f259_source is
  'ค่าที่เอกสาร F-259 บันทึกไว้รายข้อ — แยกจากค่าที่ผู้ใช้กรอกในระบบ อ่านรวมผ่าน lg_req_effective (P22 · migration 052)';
comment on column lg_req_f259_source.requirement_id is
  'NULL = จับคู่กับข้อกำหนดในทะเบียนไม่ได้ (ข้อความต่างกันเกินไป) — เก็บไว้ให้คนมาไล่เอง ไม่ทิ้ง';

-- ── มุมมองรวม (กติกา 9.6) ────────────────────────────────────────────────────
-- ค่าที่ผู้ใช้กรอกในระบบชนะเสมอ · ค่าจาก F-259 เป็นตัวสำรองเมื่อช่องในระบบว่าง
-- *_src บอกว่าค่าที่เห็นมาจากไหน เพื่อให้หน้าจอติดป้ายได้ว่า "จาก F-259"
create or replace view lg_req_effective as
select r.id                as requirement_id,
       r.law_id, r.seq, r.text, r.status, r.status_reason,
       r.evaluated_by, r.evaluated_at, r.evidence_url, r.evidence_label,
       coalesce(nullif(btrim(r.responsible), ''), f.responsible) as responsible,
       coalesce(nullif(btrim(r.frequency),   ''), f.frequency)   as frequency,
       coalesce(nullif(btrim(r.documents),   ''), f.documents)   as documents,
       f.report_to,
       case when nullif(btrim(r.responsible),'') is not null then 'system'
            when f.responsible is not null then 'f259' end       as responsible_src,
       case when nullif(btrim(r.frequency),'')   is not null then 'system'
            when f.frequency   is not null then 'f259' end       as frequency_src,
       case when nullif(btrim(r.documents),'')   is not null then 'system'
            when f.documents   is not null then 'f259' end       as documents_src,
       f.match_kind, f.source_sheet, f.source_row
  from lg_requirements r
  left join lg_req_f259_source f on f.requirement_id = r.id;

comment on view lg_req_effective is
  'ข้อกำหนดพร้อมค่าที่ใช้ได้จริง — ค่าที่ผู้ใช้กรอกชนะ ค่าจาก F-259 เป็นตัวสำรอง · *_src บอกที่มา (P22 · migration 052)';

alter table lg_req_f259_source enable row level security;
drop policy if exists lg_req_f259_source_all on lg_req_f259_source;
create policy lg_req_f259_source_all on lg_req_f259_source for all using (true) with check (true);

commit;

-- DOWN
-- drop view if exists lg_req_effective;
-- drop table if exists lg_req_f259_source;
