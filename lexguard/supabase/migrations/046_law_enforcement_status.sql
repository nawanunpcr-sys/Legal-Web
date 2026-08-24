-- 046 · P21 · สถานะการบังคับใช้ของกฎหมาย + คิวผลตรวจที่รอมนุษย์ยืนยัน
--
-- ═══ ทำไมต้องมี law_status ทั้งที่ lg_laws.status มี 'repealed' อยู่แล้ว ═══
-- lg_laws.status ปนสองเรื่องที่ไม่เกี่ยวกันไว้ในคอลัมน์เดียว:
--   ok / bad  = ผลความสอดคล้อง (คำนวณใหม่จากข้อปฏิบัติทุกครั้งที่มีการประเมิน)
--   repealed  = สถานะการบังคับใช้ (ข้อเท็จจริงทางกฎหมาย ไม่เกี่ยวกับว่าเราทำตามได้หรือไม่)
-- ผลคือ recomputeLawStatus() เขียนทับเป็น ok/bad ได้ทุกเมื่อ = 'repealed' หายไปเงียบๆ
-- และยังบอกความต่างระหว่าง "ยกเลิกทั้งฉบับ" กับ "ยกเลิกบางส่วน / แก้ไขเพิ่มเติม" ไม่ได้เลย
-- law_status จึงเป็นคอลัมน์แยกที่ไม่มีใครคำนวณทับ
--
-- ฟิลด์เดิมที่ใช้ซ้ำ ไม่สร้างใหม่ให้ซ้ำซ้อน:
--   repeal_date            = วันที่การยกเลิกมีผล
--   repeal_reason          = เหตุผล/สาระสำคัญของการยกเลิก
--   replaced_by_code       = รหัสในทะเบียนของฉบับที่ใช้แทน
--   repealed_by_authority  = เลขอ้างอิงราชกิจจานุเบกษาของฉบับที่ยกเลิก

-- ── ส่วน A · สถานะการบังคับใช้บน lg_laws ────────────────────────────────────
alter table lg_laws add column if not exists law_status            text not null default 'in_force';
alter table lg_laws add column if not exists repealed_by_title     text;
alter table lg_laws add column if not exists repealed_by_law_id    bigint references lg_laws(id) on delete set null;
alter table lg_laws add column if not exists repeal_scope          text;
alter table lg_laws add column if not exists replacement_law_title text;
alter table lg_laws add column if not exists replacement_law_id    bigint references lg_laws(id) on delete set null;
alter table lg_laws add column if not exists repeal_source_url     text;
alter table lg_laws add column if not exists repeal_sources        jsonb not null default '[]'::jsonb;
alter table lg_laws add column if not exists repeal_confidence     text;
alter table lg_laws add column if not exists repeal_detected_by    text;
alter table lg_laws add column if not exists repeal_checked_at     timestamptz;
alter table lg_laws add column if not exists repeal_verified_by    text;
alter table lg_laws add column if not exists repeal_verified_at    timestamptz;

-- ให้ฉบับที่เคยถูกทำเครื่องหมายยกเลิกไว้แล้ว มีสถานะการบังคับใช้ที่ตรงกัน
-- (10 ฉบับใน production ที่ status='repealed' อยู่ก่อนหน้านี้)
update lg_laws set law_status = 'repealed'
 where status = 'repealed' and law_status = 'in_force';

alter table lg_laws drop constraint if exists lg_laws_law_status_check;
alter table lg_laws add constraint lg_laws_law_status_check
  check (law_status in ('in_force', 'amended', 'partially_repealed', 'repealed', 'uncertain'));

alter table lg_laws drop constraint if exists lg_laws_repeal_confidence_check;
alter table lg_laws add constraint lg_laws_repeal_confidence_check
  check (repeal_confidence is null or repeal_confidence in ('high', 'medium', 'low'));

-- ห้ามบันทึกว่ายกเลิกโดยไม่มีที่อยู่อ้างอิงที่เปิดได้ (เกณฑ์ตรวจรับข้อ 2.5.1)
-- ด่านนี้อยู่ในฐานข้อมูล เพราะ RLS ของตารางนี้เป็น USING(true) จึงกันอะไรไม่ได้
-- และ AI เขียนผลผ่าน endpoint ที่ใช้ anon key เหมือนหน้าเว็บทุกประการ
--
-- ⚠ ผูกกับ repeal_detected_by โดยตั้งใจ — บังคับเฉพาะระเบียนที่มาจากการตรวจของระบบ
-- ในทะเบียนจริงมี 10 ฉบับที่ถูกทำเครื่องหมายยกเลิกไว้ตั้งแต่นำเข้าไฟล์ F-259 ครั้งแรก
-- ทั้งหมดไม่มี URL และไม่มีวันที่ (ยุคนั้นทะเบียนไม่ได้เก็บ) · บังคับแบบไม่มีเงื่อนไข
-- จะได้ผลลัพธ์อย่างใดอย่างหนึ่งที่ยอมรับไม่ได้ทั้งคู่:
--   · migration ล้ม แล้วต้องไปแก้ข้อมูลเก่าให้ผ่านด่าน = แต่งข้อมูลที่เราไม่รู้จริง
--   · หรือถ้าใช้ NOT VALID ก็จะไปล็อกทุก UPDATE ของ 10 แถวนั้นในภายหลัง
--     รวมถึงการเขียน status ปกติจาก recomputeLawStatus ซึ่งไม่เกี่ยวกับการยกเลิกเลย
-- ผลจาก AI ถูกกันไว้แน่นอนอยู่แล้วสองชั้น: ตารางคิว lg_repeal_checks บังคับไม่มีเงื่อนไข
-- และทางเขียนลง lg_laws จะตั้ง repeal_detected_by เสมอ จึงตกอยู่ใต้ด่านนี้ทุกครั้ง
alter table lg_laws drop constraint if exists lg_laws_repeal_needs_source_check;
alter table lg_laws add constraint lg_laws_repeal_needs_source_check
  check (repeal_detected_by is null
         or law_status not in ('repealed', 'partially_repealed')
         or (repeal_source_url is not null and btrim(repeal_source_url) <> ''));

-- ห้ามชี้ว่าตัวเองยกเลิกตัวเอง — วงจรแบบนี้ทำให้หน้าจอไล่สายไม่รู้จบ
alter table lg_laws drop constraint if exists lg_laws_repeal_no_self_ref_check;
alter table lg_laws add constraint lg_laws_repeal_no_self_ref_check
  check (repealed_by_law_id is distinct from id and replacement_law_id is distinct from id);

comment on column lg_laws.law_status is
  'สถานะการบังคับใช้: in_force | amended | partially_repealed | repealed | uncertain — แยกจาก status (ok/bad) ซึ่งเป็นผลความสอดคล้องและถูกคำนวณทับตลอด (P21)';
comment on column lg_laws.repeal_verified_by is
  'เจ้าหน้าที่ที่ยืนยันผลตรวจ — NULL = ยังไม่ผ่านการยืนยันโดยมนุษย์ ห้ามถือเป็นข้อมูลทางการ (P21)';

create index if not exists lg_laws_law_status_idx on lg_laws(law_status);

-- ── ส่วน B · คิวผลตรวจจาก AI ที่ยังไม่ผ่านการยืนยัน ─────────────────────────
-- ผลจาก AI ห้ามลงทะเบียนทางการอัตโนมัติ (ข้อ 2.7) จึงต้องมีที่พักของตัวเอง
-- เขียนลง lg_laws โดยตรงแล้วค่อยตั้งธง "ยังไม่ยืนยัน" ไม่ปลอดภัยพอ เพราะทุกหน้าจอ
-- ที่อ่าน lg_laws อยู่แล้วจะเห็นข้อมูลที่ยังไม่มีใครตรวจทันที โดยไม่รู้ว่าต้องกรองอะไรออก
create table if not exists lg_repeal_checks (
  id              bigserial primary key,
  law_id          bigint not null references lg_laws(id) on delete cascade,
  law_status      text   not null,
  repealed_by     jsonb,          -- { law_title, repeal_clause, effective_date, gazette_reference, source_url }
  repeal_scope    text,
  repeal_reason   text,
  replacement     jsonb,          -- { exists, law_title, effective_date, source_url, key_changes }
  confidence      text   not null,
  search_date     date   not null,
  sources         jsonb  not null default '[]'::jsonb,
  notes           text,
  registry_match  jsonb,          -- ผลจับคู่ชื่อกับทะเบียนของเราเอง (repeal-match.js)
  raw             jsonb,          -- คำตอบดิบของโมเดล ไว้สอบย้อนตอนผลดูผิด
  model           text,
  elapsed_ms      integer,
  status          text   not null default 'pending',   -- pending | applied | dismissed
  reviewed_by     text,
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz not null default now(),

  constraint lg_repeal_checks_law_status_check
    check (law_status in ('in_force', 'amended', 'partially_repealed', 'repealed', 'uncertain')),
  constraint lg_repeal_checks_confidence_check
    check (confidence in ('high', 'medium', 'low')),
  constraint lg_repeal_checks_status_check
    check (status in ('pending', 'applied', 'dismissed')),
  -- ผลที่บอกว่ายกเลิก ต้องมี source_url เสมอ ตั้งแต่ชั้นคิว ไม่ใช่ไปดักตอนยืนยัน
  constraint lg_repeal_checks_needs_source_check
    check (law_status not in ('repealed', 'partially_repealed')
           or btrim(coalesce(repealed_by->>'source_url', '')) <> '')
);

create index if not exists lg_repeal_checks_law_idx    on lg_repeal_checks(law_id);
create index if not exists lg_repeal_checks_status_idx on lg_repeal_checks(status, created_at desc);

alter table lg_repeal_checks enable row level security;
-- ให้ตรงกับตารางอื่นทั้งระบบ (แอปยังอยู่โหมด demo ยิงด้วย anon key — ดูหมายเหตุใน 032c)
-- TODO(production): รัดกลับเป็น authenticated พร้อมกันทั้งระบบเมื่อย้ายไป Supabase Auth จริง
drop policy if exists lg_repeal_checks_all on lg_repeal_checks;
create policy lg_repeal_checks_all on lg_repeal_checks for all using (true) with check (true);

comment on table lg_repeal_checks is
  'คิวผลตรวจสถานะการบังคับใช้จาก AI — รอเจ้าหน้าที่ยืนยันก่อนเขียนลง lg_laws (P21 ข้อ 2.7)';

-- DOWN
-- drop table if exists lg_repeal_checks;
-- alter table lg_laws drop constraint if exists lg_laws_repeal_no_self_ref_check;
-- alter table lg_laws drop constraint if exists lg_laws_repeal_needs_source_check;
-- alter table lg_laws drop constraint if exists lg_laws_repeal_confidence_check;
-- alter table lg_laws drop constraint if exists lg_laws_law_status_check;
-- alter table lg_laws drop column if exists repeal_verified_at, drop column if exists repeal_verified_by,
--   drop column if exists repeal_checked_at, drop column if exists repeal_detected_by,
--   drop column if exists repeal_confidence, drop column if exists repeal_sources,
--   drop column if exists repeal_source_url, drop column if exists replacement_law_id,
--   drop column if exists replacement_law_title, drop column if exists repeal_scope,
--   drop column if exists repealed_by_law_id, drop column if exists repealed_by_title,
--   drop column if exists law_status;
