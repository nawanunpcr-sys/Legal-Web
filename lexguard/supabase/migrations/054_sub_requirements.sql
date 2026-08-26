-- 054 · P24 · แตกข้อกำหนดเป็นข้อย่อยที่ประเมินได้ทีละข้อ + ผลติ๊กรายข้อ
--
-- ปัญหา: ระบบประเมินได้ละเอียดสุดที่ระดับ "ข้อกำหนด" จึงตอบได้แค่สอดคล้อง/ไม่สอดคล้อง
-- แต่ตอบไม่ได้ว่าไม่สอดคล้องตรงจุดใด
-- ตัวอย่าง: ตัวบทสั่งให้ตรวจวัดเสียงปีละครั้งและเก็บผล 5 ปี
--           องค์กรตรวจแล้วแต่เก็บไว้ 2 ปี — ช่องว่างอยู่ที่ระยะเวลาเก็บ ไม่ใช่การตรวจวัด
--           ระบบเดิมแยกไม่ออก ได้แค่ NC ทั้งข้อ
--
-- ═══ ทำไมตารางเดียว ไม่ใช่สองตารางตามที่สเปกเขียน ═══
-- สเปกเดิมแยก lg_law_requirements (นิยาม) กับ lg_requirement_checks (ผลติ๊ก)
-- โดยผูก assessment_id เข้ากับ "ตารางการประเมิน" — แต่ระบบนี้ไม่มีตารางนั้น
--   lg_law_workflow / lg_assessment_flow ว่างทั้งคู่ · ผลประเมินจริงอยู่ที่ lg_requirements
-- เมื่อผูกข้อย่อยเข้ากับ lg_requirements โดยตรง ผลติ๊กจึงมีได้ชุดเดียวต่อข้อย่อย
-- ตารางแยกจึงไม่ได้อะไรเพิ่ม นอกจากทำให้ทุก query ต้อง join เปล่าๆ
-- (ประวัติการเปลี่ยนแปลงเก็บที่ lg_activity_log เหมือนที่ lg_requirements ทำอยู่)
--
-- ═══ กติกาข้อ 9 · additive-only ═══
-- สร้างตารางใหม่ + view เท่านั้น · ไม่มี UPDATE/DELETE · ไม่แตะ lg_requirements 575 แถว
-- ข้อย่อยเป็น "ลูก" ของข้อกำหนด ผลประเมินเดิมทั้ง 575 แถวจึงอยู่ครบเหมือนเดิม

begin;

create table if not exists lg_sub_requirements (
  id             bigint generated always as identity primary key,
  requirement_id bigint not null references lg_requirements(id) on delete cascade,
  law_id         bigint references lg_laws(id) on delete cascade,   -- ซ้ำไว้เพื่อ query เร็ว
  seq            int not null default 0,

  -- ── นิยามข้อย่อย ──
  title             text not null,        -- ชื่อสั้น ไม่เกิน 1 บรรทัด
  action_required   text,                 -- สิ่งที่ต้องทำ · ประโยคคำสั่งที่ลงมือได้จริง
  evidence_required text,                 -- หลักฐานที่ต้องมีตอนตรวจประเมิน
  risk_level        text not null default 'medium',
  note              text,                 -- เฉพาะกรณีตัวบทคลุมเครือ
  generated_by      text not null default 'ai',   -- ai | manual
  model             text,
  created_at        timestamptz not null default now(),

  -- ── ผลติ๊กของผู้ประเมิน ──
  -- is_met: null = ยังไม่ประเมิน · true = ทำแล้ว · false = ยังไม่ทำ
  is_met         boolean,
  is_na          boolean not null default false,
  check_note     text,
  evidence_url   text,        -- เก็บ URL ตรงๆ แทน FK ไป lg_attachments
  evidence_label text,        -- เพราะ ref_type ของตารางนั้นไม่มีค่า 'requirement'
  checked_by     text,
  checked_at     timestamptz,

  constraint lg_sub_req_risk_check
    check (risk_level in ('critical','high','medium','low')),
  constraint lg_sub_req_gen_check
    check (generated_by in ('ai','manual')),
  -- "ไม่เกี่ยวข้อง" กับ "ทำแล้ว/ยังไม่ทำ" เป็นคนละแกน เลือกพร้อมกันไม่ได้
  constraint lg_sub_req_na_check
    check (is_na = false or is_met is null),
  -- ติ๊กแล้วต้องรู้ว่าใครติ๊ก — ผลประเมินที่ไม่มีเจ้าของใช้ตอบผู้ตรวจไม่ได้
  constraint lg_sub_req_checked_by_check
    check ((is_met is null and is_na = false)
           or (checked_by is not null and btrim(checked_by) <> '')),
  -- "ยังไม่ทำ" ต้องบอกเหตุผลหรือแผน ไม่งั้นเปิดแผนปรับปรุงต่อไม่ได้
  constraint lg_sub_req_unmet_note_check
    check (is_met is not false or (check_note is not null and btrim(check_note) <> ''))
);

create index if not exists lg_sub_req_req_idx  on lg_sub_requirements(requirement_id, seq);
create index if not exists lg_sub_req_law_idx  on lg_sub_requirements(law_id);
create index if not exists lg_sub_req_risk_idx on lg_sub_requirements(risk_level) where is_met is false;

comment on table lg_sub_requirements is
  'ข้อย่อยของข้อกำหนด — ประเมินได้ทีละข้อ พร้อมผลติ๊กและหลักฐาน (P24 · migration 054)';
comment on column lg_sub_requirements.is_met is
  'null = ยังไม่ประเมิน · true = ทำแล้ว · false = ยังไม่ทำ — ใช้คู่กับ is_na ซึ่งเป็นคนละแกน';
comment on column lg_sub_requirements.risk_level is
  'critical (แดง) | high (ส้ม) | medium (เหลือง) | low (เขียว) — ความเสี่ยงหากไม่ปฏิบัติ';

-- ── ความคืบหน้าต่อข้อกำหนด + สถานะที่ระบบแนะนำ ─────────────────────────────
-- ⚠ suggested เป็น "ข้อเสนอ" เท่านั้น — ต้องมีคนกดยืนยันจึงจะเขียนลง lg_requirements.status
--   ระบบไม่เปลี่ยนสถานะให้อัตโนมัติไม่ว่ากรณีใด (กติกาข้อ 3)
create or replace view lg_sub_req_progress as
select r.id                                    as requirement_id,
       r.law_id,
       r.status                                as current_status,
       count(s.id)                             as total,
       count(*) filter (where s.is_met is true)                     as met,
       count(*) filter (where s.is_met is false)                    as unmet,
       count(*) filter (where s.is_na is true)                      as na,
       count(*) filter (where s.is_met is null and s.is_na is false) as pending,
       count(*) filter (where s.is_met is false and s.risk_level = 'critical') as unmet_critical,
       count(*) filter (where s.is_met is false and s.risk_level = 'high')     as unmet_high,
       case
         when count(s.id) = 0 then null
         when count(*) filter (where s.is_met is null and s.is_na is false) > 0 then null
         when count(*) filter (where s.is_met is false) > 0 then 'unmet'
         when count(*) filter (where s.is_na is true) = count(s.id) then 'not_applicable'
         else 'met'
       end                                     as suggested_status
  from lg_requirements r
  left join lg_sub_requirements s on s.requirement_id = r.id
 group by r.id, r.law_id, r.status;

comment on view lg_sub_req_progress is
  'ความคืบหน้าการติ๊กข้อย่อยต่อข้อกำหนด · suggested_status เป็นข้อเสนอ ต้องมีคนยืนยันก่อนเสมอ (P24)';

alter table lg_sub_requirements enable row level security;
drop policy if exists lg_sub_requirements_all on lg_sub_requirements;
create policy lg_sub_requirements_all on lg_sub_requirements for all using (true) with check (true);

commit;

-- DOWN
-- drop view if exists lg_sub_req_progress;
-- drop table if exists lg_sub_requirements;
