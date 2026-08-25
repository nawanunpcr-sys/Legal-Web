-- 047 · P22 ขั้นที่ 1 · บริบทองค์กร + ผลคัดกรองความเกี่ยวข้อง
--
-- ข้อเสนอแนะของผู้ประเมินข้อ 1: "ระบบไม่สามารถบอกได้ว่ากฎหมายฉบับใดเกี่ยวข้องกับลักษณะ
-- ธุรกิจของบริษัท ผู้ใช้ต้องคัดกรองเองทุกฉบับ"
--
-- ระบบรู้ว่าตัวบทใช้กับ "ใคร" (ข้อความ applicability ที่ถูกยุบรวมอยู่ใน lg_requirements.note)
-- แต่ไม่เคยรู้ว่า "เรา" เป็นใคร จึงเทียบสองฝั่งไม่ได้ · ตารางแรกเก็บฝั่ง "เรา"
-- ตารางที่สองเก็บผลการเทียบ พร้อมร่องรอยว่า AI เสนออะไร และใครเป็นคนยืนยัน
--
-- ═══ กติกาข้อ 9 · additive-only ═══
-- ไฟล์นี้สร้างตารางใหม่ 2 ตารางเท่านั้น
-- ไม่มี UPDATE · ไม่มี DELETE · ไม่แตะคอลัมน์ใดของตารางเดิมแม้แต่คอลัมน์เดียว
--
-- ═══ ที่มาของโครงโปรไฟล์ ═══
-- ไม่ได้คิดเอง — มาจากเหตุผลที่ผู้ใช้เขียนไว้จริงในช่อง "หมายเหตุ" ของ F-259
-- (ดู docs/f259-mapping.md ข้อ 4) ซึ่งแบ่งได้ 4 ประเภท:
--   1. สถานะตามรายชื่อของหน่วยงานกำกับ  เช่น "กสทช. แจ้งว่า JasTel ไม่อยู่ในรายชื่อ CII"  ← พบมากที่สุด
--   2. ขนาดองค์กร                        เช่น "ลูกจ้างตั้งแต่ 50 คนขึ้นไป"
--   3. ลักษณะทางกายภาพของสถานประกอบกิจการ เช่น "ชั้น G และ P10 · Gen เกิน 2,500 ลิตร"
--   4. บทบาทในห่วงโซ่ธุรกิจ              เช่น "เป็นผู้ใช้งานสายใยนำแสง ไม่ใช่ผู้ผลิต"

begin;

-- ── (1) โปรไฟล์บริบทองค์กร — แถวเดียวทั้งระบบ ────────────────────────────────
-- บังคับ id = 1 ด้วย CHECK เหมือน lg_settings เพื่อไม่ให้มีโปรไฟล์ที่สองหลุดเข้ามา
-- แล้วหน้าจอกับ endpoint อ่านคนละแถวกันโดยไม่มีใครรู้
create table if not exists lg_company_profile (
  id                 int primary key default 1 check (id = 1),
  -- ── ฟิลด์หลักที่ query ได้ (ใช้ในเงื่อนไขเชิงตัวเลข/ข้อความตรงๆ) ──
  business_type      text,           -- ประเภทกิจการ เช่น ผู้ให้บริการโครงข่ายโทรคมนาคม
  workplace_type     text,           -- ลักษณะสถานประกอบกิจการ เช่น สำนักงาน + ศูนย์ข้อมูล
  employee_count     int,            -- จำนวนลูกจ้าง — เกณฑ์ที่กฎหมายไทยใช้บ่อยที่สุด (10/20/50/100 คน)
  contractor_count   int,            -- ผู้รับเหมาประจำ (บางฉบับนับรวม)
  site_count         int,            -- จำนวนพื้นที่/สาขา
  value_chain_role   text,           -- ผู้ใช้งาน | ผู้ให้บริการ | ผู้ผลิต | ผู้นำเข้า (ข้อ 4)
  -- ── ส่วนที่เป็นรายการ เก็บเป็น jsonb (array ของ string หรือ object) ──
  sites              jsonb not null default '[]'::jsonb,  -- [{name, address, floors, note}]
  activities         jsonb not null default '[]'::jsonb,  -- ทำงานบนที่สูง / ที่อับอากาศ / ไฟฟ้าแรงสูง / …
  machines           jsonb not null default '[]'::jsonb,  -- เครื่องจักรและอุปกรณ์ (เครื่องกำเนิดไฟฟ้า ลิฟต์ ปั้นจั่น)
  chemicals          jsonb not null default '[]'::jsonb,  -- สารเคมีที่ใช้จริง + ปริมาณ
  licenses           jsonb not null default '[]'::jsonb,  -- ใบอนุญาตที่ถือครอง [{name, no, issuer, expires}]
  regulator_status   jsonb not null default '[]'::jsonb,  -- ข้อ 1 · [{scheme:'CII', listed:false, source:'', note:''}]
  iso_scope          jsonb not null default '[]'::jsonb,  -- [{standard:'ISO 45001', clause:'6.1.3'}] จากชีทข้อมูลจำเพาะ F-259
  extra              jsonb not null default '{}'::jsonb,  -- ที่ว่างสำหรับข้อมูลที่ยังนึกไม่ถึงตอนนี้
  updated_by         text,
  updated_at         timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

comment on table lg_company_profile is
  'บริบทองค์กรสำหรับคัดกรองความเกี่ยวข้องของกฎหมาย — แถวเดียว (id=1) · P22 ขั้นที่ 1';
comment on column lg_company_profile.regulator_status is
  'สถานะตามรายชื่อของหน่วยงานกำกับ เช่น CII ของ กสทช. — เหตุผลที่ผู้ใช้อ้างมากที่สุดใน F-259';

-- ── (2) ผลคัดกรองความเกี่ยวข้องรายฉบับ ───────────────────────────────────────
-- 1 แถวต่อ 1 ฉบับ · เก็บทั้ง "ข้อเสนอของ AI" และ "คำตัดสินของคน" ไว้คู่กัน (กติกาข้อ 3)
-- ห้ามให้คำตัดสินของคนไปทับข้อเสนอของ AI — ตอนตรวจ ISO ต้องตอบได้ว่า
-- เครื่องเสนออะไร คนเห็นต่างหรือไม่ และใครเป็นคนตัดสิน
create table if not exists lg_law_relevance (
  id             bigint generated always as identity primary key,
  law_id         bigint not null references lg_laws(id) on delete cascade,

  -- ฝั่ง AI (ข้อเสนอ — ไม่มีผลใดๆ จนกว่าคนจะยืนยัน)
  verdict        text not null default 'uncertain',
  confidence     numeric(3,2),
  reason         text,
  matched_keys   jsonb not null default '[]'::jsonb,   -- คีย์ในโปรไฟล์ที่ใช้ตัดสิน ['employee_count','activities']
  requirement_flags jsonb not null default '[]'::jsonb,-- [{requirement_id, applies, why}] — ข้อเสนอรายข้อ
  needs_info     jsonb not null default '[]'::jsonb,   -- uncertain: ต้องการข้อมูลอะไรเพิ่มในโปรไฟล์
  model          text,
  suggested_at   timestamptz,
  profile_at     timestamptz,     -- โปรไฟล์ ณ เวลาที่คัดกรอง — โปรไฟล์เปลี่ยนแล้วผลเก่าอาจใช้ไม่ได้

  -- ฝั่งคน (คำตัดสินจริง)
  confirmed_verdict text,         -- null = ยังไม่มีใครยืนยัน
  confirmed_by      text,
  confirmed_at      timestamptz,
  confirm_note      text,         -- บังคับกรอกเมื่อคนเห็นต่างจาก AI (ดู CHECK ข้างล่าง)

  created_at     timestamptz not null default now(),

  constraint lg_law_relevance_law_uniq unique (law_id),
  constraint lg_law_relevance_verdict_check
    check (verdict in ('relevant','not_relevant','uncertain')),
  constraint lg_law_relevance_confirmed_check
    check (confirmed_verdict is null or confirmed_verdict in ('relevant','not_relevant','uncertain')),
  constraint lg_law_relevance_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  -- ยืนยันแล้วต้องรู้ว่าใครยืนยัน — ผลคัดกรองที่ไม่มีชื่อคนรับผิดชอบใช้ตอบผู้ตรวจไม่ได้
  constraint lg_law_relevance_confirmed_needs_who_check
    check (confirmed_verdict is null or (confirmed_by is not null and btrim(confirmed_by) <> '')),
  -- เห็นต่างจาก AI ต้องเขียนเหตุผล · เห็นตรงกันไม่ต้อง (คำอธิบายของ AI ทำหน้าที่นั้นอยู่แล้ว)
  constraint lg_law_relevance_disagree_needs_note_check
    check (confirmed_verdict is null or confirmed_verdict = verdict
           or (confirm_note is not null and btrim(confirm_note) <> ''))
);

create index if not exists lg_law_relevance_law_idx     on lg_law_relevance(law_id);
create index if not exists lg_law_relevance_verdict_idx on lg_law_relevance(verdict);
create index if not exists lg_law_relevance_confirmed_idx on lg_law_relevance(confirmed_verdict);

comment on table lg_law_relevance is
  'ผลคัดกรองความเกี่ยวข้องของกฎหมายกับบริบทองค์กร — เก็บข้อเสนอของ AI คู่กับคำตัดสินของคน (P22 ขั้นที่ 1)';
comment on column lg_law_relevance.confirmed_verdict is
  'NULL = ยังไม่มีคนยืนยัน · ผลของ AI เพียงลำพังห้ามถือเป็นข้อมูลทางการของทะเบียน (กติกาข้อ 3)';

-- ── (3) มุมมองรวม — อ่านผลสุดท้ายได้ในที่เดียว (กติกา 9.6) ────────────────────
-- final_verdict = คำตัดสินของคนถ้ามี ไม่มีก็ยังไม่ถือว่าคัดกรองแล้ว (ไม่ตกไปใช้ค่าของ AI)
create or replace view lg_law_relevance_view as
select l.id                              as law_id,
       l.code, l.cat, l.name,
       r.verdict                         as ai_verdict,
       r.confidence                      as ai_confidence,
       r.reason                          as ai_reason,
       r.suggested_at,
       r.confirmed_verdict,
       r.confirmed_by,
       r.confirmed_at,
       r.confirm_note,
       coalesce(r.confirmed_verdict, 'unscreened') as final_verdict,
       (r.confirmed_verdict is not null and r.confirmed_verdict is distinct from r.verdict) as human_overrode
  from lg_laws l
  left join lg_law_relevance r on r.law_id = l.id;

comment on view lg_law_relevance_view is
  'ผลคัดกรองสุดท้ายรายฉบับ — final_verdict = unscreened จนกว่าจะมีคนยืนยัน (P22 ขั้นที่ 1)';

-- ── (4) RLS — ตามแบบเดียวกับทุกตารางในระบบ (โหมด demo · anon key) ────────────
-- TODO(production): รัดกลับเป็น authenticated พร้อมกันทั้งระบบเมื่อย้ายไป Supabase Auth จริง
alter table lg_company_profile enable row level security;
alter table lg_law_relevance   enable row level security;
drop policy if exists lg_company_profile_all on lg_company_profile;
drop policy if exists lg_law_relevance_all   on lg_law_relevance;
create policy lg_company_profile_all on lg_company_profile for all using (true) with check (true);
create policy lg_law_relevance_all   on lg_law_relevance   for all using (true) with check (true);

commit;

-- DOWN
-- drop view if exists lg_law_relevance_view;
-- drop table if exists lg_law_relevance;
-- drop table if exists lg_company_profile;
