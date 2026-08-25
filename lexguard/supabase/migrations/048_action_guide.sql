-- 048 · P22 ขั้นที่ 2 · "สิ่งที่ต้องดำเนินการ / เอกสาร / หลักฐาน" รายกฎหมาย
--
-- ข้อเสนอแนะของผู้ประเมินข้อ 2: "ระบบแสดงเพียงข้อกำหนดทางกฎหมาย แต่ไม่มีสรุปว่าองค์กร
-- ต้องดำเนินการอะไร ต้องจัดทำเอกสารใด และต้องเก็บหลักฐานใดไว้ให้ผู้ตรวจ"
--
-- ═══ ทำไมเป็นตารางใหม่ ไม่ใช่คอลัมน์ใน lg_laws ตามที่แผนเขียนไว้ ═══
-- แผนเดิมระบุ `alter table lg_laws add column action_guide jsonb` ซึ่งเพิ่มคอลัมน์ได้ตามกติกา 9.1
-- แต่ "การเขียนค่าลงไป" คือ UPDATE แถวของ lg_laws ที่มีอยู่ก่อนงานนี้ทั้ง 160 แถว
-- ซึ่งกติกา 9.2 ห้ามไว้ และ 9.6 บอกให้ใช้ view อ่านรวมแทนการเพิ่มคอลัมน์ลงตารางเดิม
-- เก็บแยกตารางจึงได้ทั้งสองอย่าง: lg_laws ไม่ถูกแตะแม้แต่แถวเดียว และอ่านรวมได้ผ่าน view
-- ผลพลอยได้: เก็บประวัติได้ว่าใครสั่งสร้างเมื่อไร ด้วยโมเดลตัวไหน ซึ่งคอลัมน์เดี่ยวทำไม่ได้
--
-- ═══ เลขที่ไฟล์ ═══
-- แผนเขียนไว้ว่า 049 แต่ขั้นที่ 2 ทำก่อนขั้นที่ 3 จึงใช้ 048 ให้เรียงตามเวลาที่รันจริง
-- (ขั้นที่ 3 · lg_req_ai_suggestion จะเป็น 049)
--
-- ═══ โครง action_guide มาจากไหน ═══
-- ไม่ได้ออกแบบลอยๆ — มาจาก docs/f259-mapping.md ข้อ 3 ซึ่งพบว่าในเอกสารจริง
-- ช่อง "เอกสารที่เกี่ยวข้อง" ถูกใช้ปนกัน 4 ความหมาย งานของขั้นนี้คือแยกมันออกจากกัน:
--   (1) ชื่อเอกสาร/แบบฟอร์มที่เป็นหลักฐาน   → evidence[]
--   (2) ลิงก์ที่เก็บไฟล์จริง                  → evidence[].name
--   (3) วิธีปฏิบัติ / ใครทำ                   → actions[]
--   (4) เหตุผลว่าไม่เข้าข่าย                  → ไม่ใช่ของหน้านี้ ปล่อยไว้ที่ status_reason

begin;

create table if not exists lg_law_action_guide (
  law_id       bigint primary key references lg_laws(id) on delete cascade,

  -- โครงเดียวกับที่แผนกำหนดไว้ทุกคีย์
  --   actions   [{what, who, frequency, deadline, section_ref}]
  --   documents [{name, purpose, section_ref, who_keeps}]
  --   evidence  [{name, why_auditor_asks, section_ref}]
  --   not_specified [{item, what_missing, section_ref}]  ← ตัวบทไม่ได้กำหนด องค์กรต้องกำหนดเอง
  guide        jsonb not null default '{}'::jsonb,

  model        text,
  generated_by text,
  generated_at timestamptz not null default now(),
  req_count    int,          -- จำนวนข้อกำหนดที่ใช้สังเคราะห์ — ถ้าภายหลังจำนวนเปลี่ยน แปลว่าคู่มือเก่าแล้ว
  created_at   timestamptz not null default now()
);

comment on table lg_law_action_guide is
  'สิ่งที่องค์กรต้องดำเนินการ/เอกสารที่ต้องจัดทำ/หลักฐานที่ต้องเก็บ รายกฎหมาย — สังเคราะห์จาก lg_requirements ของฉบับนั้น (P22 ขั้นที่ 2)';
comment on column lg_law_action_guide.guide is
  'โครง {actions[], documents[], evidence[], not_specified[]} — ทุกบรรทัดต้องมี section_ref ชี้กลับข้อกำหนดต้นทาง';
comment on column lg_law_action_guide.req_count is
  'จำนวนข้อกำหนด ณ เวลาที่สังเคราะห์ — ใช้เตือนว่าคู่มือล้าสมัยเมื่อข้อกำหนดถูกเพิ่ม/ลบภายหลัง';

-- ── มุมมองรวม (กติกา 9.6) — อ่านทะเบียนพร้อมสถานะคู่มือได้ในที่เดียว ──────────
create or replace view lg_law_action_guide_view as
select l.id                            as law_id,
       l.code, l.cat, l.name,
       g.guide,
       g.generated_at,
       g.generated_by,
       g.req_count                     as guide_req_count,
       (select count(*) from lg_requirements r where r.law_id = l.id) as req_count_now,
       (g.law_id is not null)          as has_guide,
       -- คู่มือถูกสร้างไว้ก่อน แล้วข้อกำหนดถูกเพิ่ม/ลบทีหลัง = ต้องสร้างใหม่
       (g.law_id is not null
        and g.req_count is distinct from (select count(*) from lg_requirements r where r.law_id = l.id)) as guide_stale
  from lg_laws l
  left join lg_law_action_guide g on g.law_id = l.id;

comment on view lg_law_action_guide_view is
  'ทะเบียนพร้อมสถานะคู่มือปฏิบัติ — guide_stale = true แปลว่าข้อกำหนดเปลี่ยนหลังสร้างคู่มือ (P22 ขั้นที่ 2)';

alter table lg_law_action_guide enable row level security;
drop policy if exists lg_law_action_guide_all on lg_law_action_guide;
create policy lg_law_action_guide_all on lg_law_action_guide for all using (true) with check (true);

commit;

-- DOWN
-- drop view if exists lg_law_action_guide_view;
-- drop table if exists lg_law_action_guide;
