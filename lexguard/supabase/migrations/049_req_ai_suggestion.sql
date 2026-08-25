-- 049 · P22 ขั้นที่ 3 · ข้อเสนอสถานะการประเมินรายข้อจาก AI
--
-- ข้อเสนอแนะของผู้ประเมินข้อ 3: "การประเมินความสอดคล้องยังพึ่งการวิเคราะห์ของคนล้วน
-- ทำให้ใช้เวลามาก และผลประเมินของแต่ละคนแตกต่างกัน"
--
-- งานนี้แก้สองเรื่องพร้อมกัน:
--   (ก) ความเร็ว — AI อ่านข้อกำหนด + โปรไฟล์องค์กร + หลักฐานที่แนบไว้ แล้วเสนอสถานะมาก่อน
--   (ข) ความต่างระหว่างผู้ประเมิน — เกณฑ์ตัดสิน 4 สถานะถูกเขียนเป็นข้อความเดียวกัน
--       และแสดงในทุกจุดที่มีการประเมิน ทุกคนจึงใช้นิยามชุดเดียวกัน
--
-- ═══ กติกาข้อ 9 · additive-only ═══
-- สร้างตารางใหม่ 1 ตาราง ไม่มี UPDATE ไม่มี DELETE ไม่แตะคอลัมน์ใดของตารางเดิม
--
-- ═══ ทำไมต้องเก็บ accepted ═══
-- เพื่อวัดย้อนหลังว่า AI เสนอแม่นแค่ไหน ถ้าผู้ประเมินไม่รับข้อเสนอเกินครึ่ง
-- แปลว่า prompt หรือข้อมูลที่ป้อนเข้าไปมีปัญหา ต้องแก้ที่ต้นทาง ไม่ใช่ให้คนทนใช้ต่อ
-- ข้อมูลชุดนี้คือหลักฐานว่าระบบ "ช่วย" จริงหรือแค่ "เพิ่มขั้นตอน"

begin;

create table if not exists lg_req_ai_suggestion (
  id               bigint generated always as identity primary key,
  requirement_id   bigint not null references lg_requirements(id) on delete cascade,
  law_id           bigint references lg_laws(id) on delete cascade,

  -- ฝั่ง AI (ข้อเสนอ — ไม่มีผลใดๆ จนกว่าคนจะกดรับ)
  suggested_status text not null,
  confidence       numeric(3,2),
  reason           text,                                  -- ต้องอธิบายว่าเข้าเกณฑ์ข้อใด
  criterion        text,                                  -- เกณฑ์ที่ใช้ตัดสิน (met/unmet/acknowledged/not_applicable)
  evidence_needed  jsonb not null default '[]'::jsonb,    -- หลักฐานที่ยังขาด — ใช้ต่อยอดเป็นแผนปรับปรุงได้
  evidence_seen    jsonb not null default '[]'::jsonb,    -- หลักฐานที่ระบบเห็นตอนตัดสิน (สอบกลับได้ว่าตัดสินจากอะไร)
  model            text,
  created_at       timestamptz not null default now(),

  -- ฝั่งคน
  accepted         boolean,        -- null = ยังไม่ตัดสิน · true = ใช้ข้อเสนอ · false = ประเมินเอง
  decided_status   text,           -- สถานะที่คนเลือกจริง (เก็บไว้เทียบกับที่ AI เสนอ)
  decided_by       text,
  decided_at       timestamptz,

  constraint lg_req_ai_suggestion_status_check
    check (suggested_status in ('met','unmet','acknowledged','not_applicable')),
  constraint lg_req_ai_suggestion_decided_check
    check (decided_status is null or decided_status in ('met','unmet','acknowledged','not_applicable')),
  constraint lg_req_ai_suggestion_confidence_check
    check (confidence is null or (confidence >= 0 and confidence <= 1)),
  -- ตัดสินแล้วต้องรู้ว่าใคร — ตัวเลขความแม่นที่ไม่มีเจ้าของคำตัดสินใช้อ้างอิงไม่ได้
  constraint lg_req_ai_suggestion_decided_needs_who_check
    check (accepted is null or (decided_by is not null and btrim(decided_by) <> ''))
);

create index if not exists lg_req_ai_sugg_req_idx  on lg_req_ai_suggestion(requirement_id);
create index if not exists lg_req_ai_sugg_law_idx  on lg_req_ai_suggestion(law_id);
create index if not exists lg_req_ai_sugg_open_idx on lg_req_ai_suggestion(requirement_id, created_at desc);

comment on table lg_req_ai_suggestion is
  'ข้อเสนอสถานะการประเมินรายข้อจาก AI — ต้องมีคนกดรับจึงจะกลายเป็นผลจริงใน lg_requirements (P22 ขั้นที่ 3)';
comment on column lg_req_ai_suggestion.accepted is
  'NULL = ยังไม่ตัดสิน · true = ผู้ประเมินใช้ข้อเสนอ · false = ประเมินเอง — ใช้วัดความแม่นของ AI ย้อนหลัง';

-- ── มุมมองรวม (กติกา 9.6) ────────────────────────────────────────────────────
-- จับคู่ข้อเสนอล่าสุดของแต่ละข้อกับสถานะจริงในทะเบียน
-- human_assessed อิงจาก evaluated_by ไม่ใช่ evaluated_at เพราะ migration 044 เติม
-- evaluated_at ให้ทั้ง 575 แถวไปแล้ว (ดูหมายเหตุในไฟล์ 044) ตัวชี้ว่า "มีคนประเมินจริง"
-- ที่ยังเชื่อถือได้จึงเหลือ evaluated_by อย่างเดียว
create or replace view lg_req_suggestion_view as
select r.id                    as requirement_id,
       r.law_id,
       r.status                as current_status,
       r.evaluated_by,
       r.evaluated_at,
       (r.evaluated_by is not null and btrim(r.evaluated_by) <> '') as human_assessed,
       s.id                    as suggestion_id,
       s.suggested_status,
       s.confidence,
       s.reason,
       s.criterion,
       s.evidence_needed,
       s.created_at            as suggested_at,
       s.accepted,
       s.decided_status,
       s.decided_by,
       s.decided_at
  from lg_requirements r
  left join lateral (
    select * from lg_req_ai_suggestion x
     where x.requirement_id = r.id
     order by x.created_at desc
     limit 1
  ) s on true;

comment on view lg_req_suggestion_view is
  'ข้อกำหนดพร้อมข้อเสนอล่าสุดของ AI · human_assessed = มีคนประเมินจริง (อิง evaluated_by) (P22 ขั้นที่ 3)';

alter table lg_req_ai_suggestion enable row level security;
drop policy if exists lg_req_ai_suggestion_all on lg_req_ai_suggestion;
create policy lg_req_ai_suggestion_all on lg_req_ai_suggestion for all using (true) with check (true);

commit;

-- DOWN
-- drop view if exists lg_req_suggestion_view;
-- drop table if exists lg_req_ai_suggestion;
