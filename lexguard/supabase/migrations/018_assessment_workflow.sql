-- 018_assessment_workflow.sql — สายงานประเมินกฎหมายตามกระบวนการจริงขององค์กร
--   ผู้ค้นหา → คัดกรอง(เกี่ยวข้อง/ไม่เกี่ยวข้อง) → มอบหมายหน่วยงาน(ผู้ประเมิน)
--   → ประเมินรายข้อ C/NC → NC ต้องมีแผนปรับปรุง → ปิดแผนแล้วพลิก NC→C
--
-- ยังไม่ทำระบบบัญชีผู้ใช้รายคน (ล็อกอินโหมด demo) — จึงเก็บผู้ทำรายการเป็น text
-- (screen_by / assigned_by / owner_name / closed_by ฯลฯ)
-- TODO(auth): เมื่อย้ายไป Supabase Auth รายคน ให้ map ฟิลด์ *_by/owner_name
--             เป็น uuid references auth.users แทน free text
--
-- RLS: permissive public เหมือน schema.sql / migration 015 (แอปใช้ anon key + demo login)

begin;

-- ── (1ก) หน่วยงาน (ผู้ประเมิน) ───────────────────────────────────────────────
create table if not exists lg_departments (
  id     bigint generated always as identity primary key,
  name   text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- seed ค่าเริ่มต้น = ค่าที่ normalize แล้วจากคอลัมน์ responsible ของ lg_requirements จริง
--   (Safety 23, CCS 52, HR, MTN, OFP, Data center→Data Center, Implement→Implementation,
--    QA→QA & Training ฯลฯ) + หน่วยงานองค์กรที่ทราบเพิ่มเติม
insert into lg_departments (name) values
  ('Safety'), ('HR'), ('QA & Training'), ('Power'), ('Data Center'),
  ('Corporate Affair'), ('Premium Asset'), ('Implementation'), ('MTN'),
  ('OFP'), ('CCS')
on conflict (name) do nothing;

-- นอกจาก list ข้างต้น: ดึงค่า distinct ที่ยัง "สะอาด" (โทเคนเดี่ยว ไม่ใช่ค่าผสมหลายฝ่าย)
-- จาก responsible จริง มา seed เพิ่ม เพื่อไม่ให้หน่วยงานที่มีอยู่จริงตกหล่น
insert into lg_departments (name)
  select distinct trim(responsible)
  from lg_requirements
  where responsible is not null
    and trim(responsible) <> ''
    and position(chr(10) in responsible) = 0   -- ข้ามค่าหลายบรรทัด (ค่าผสมหลายฝ่าย)
    and position('/' in responsible) = 0       -- ข้าม "A / B"
    and length(trim(responsible)) <= 20
    and trim(responsible) not in ('ทุกคน')     -- ไม่ใช่ชื่อหน่วยงาน
    and lower(trim(responsible)) not in (select lower(name) from lg_departments)
on conflict (name) do nothing;

-- ── (1ข) สายงานประเมิน — 1 แถวต่อ (batch นำเข้า × หน่วยงานที่มอบหมาย) ────────────
-- ก่อนมอบหมาย: 1 แถวต่อ batch (assigned_dept_id = null) ใช้เก็บผลคัดกรอง
-- หลังมอบหมาย: 1 แถวต่อหน่วยงาน (แตกงานย่อยตามที่ผู้ค้นหาเลือก)
-- ผูกกับ batch ใน lg_import_staging ด้วย (cat, law_code); law_id เติมเมื่อขึ้นทะเบียนแล้ว
create table if not exists lg_assessment_flow (
  id            bigint generated always as identity primary key,
  cat           text,
  law_code      text,
  law_name      text,
  law_id        bigint references lg_laws(id) on delete cascade,
  -- คัดกรอง (ขั้น 1)
  screen_status text not null default 'pending',   -- pending | relevant | not_relevant
  screen_by     text,
  screen_note   text,                              -- เหตุผลกรณีตัดว่าไม่เกี่ยวข้อง
  screened_at   timestamptz,
  -- มอบหมาย (ขั้น 2)
  assigned_dept_id bigint references lg_departments(id),
  assigned_by      text,
  assigned_at      timestamptz,
  assess_due_date  date,
  -- ประเมิน (ขั้น 3)
  assess_status text not null default 'pending',   -- pending | in_progress | done
  assessed_by   text,
  assessed_at   timestamptz,
  -- ยืนยันเข้าทะเบียนสมบูรณ์ (ขั้นสุดท้าย — item 7)
  finalized_at  timestamptz,
  finalized_by  text,
  created_at timestamptz not null default now(),
  created_by text
);
create index if not exists idx_lg_flow_batch on lg_assessment_flow(cat, law_code);
create index if not exists idx_lg_flow_law   on lg_assessment_flow(law_id);
create index if not exists idx_lg_flow_dept  on lg_assessment_flow(assigned_dept_id);

-- ── (1ค) แผนปรับปรุง (ขั้น 4) ────────────────────────────────────────────────
create table if not exists lg_improvement_plans (
  id            bigint generated always as identity primary key,
  requirement_id bigint references lg_requirements(id) on delete cascade,
  law_id        bigint references lg_laws(id) on delete cascade,
  plan_text     text not null,                     -- จะทำอะไร
  owner_dept_id bigint references lg_departments(id),
  owner_name    text,
  due_date      date,
  status        text not null default 'open',      -- open | in_progress | done  (overdue = คำนวณจาก due_date)
  evidence      text,
  closed_at     timestamptz,
  closed_by     text,
  created_at    timestamptz not null default now(),
  created_by    text
);
create index if not exists idx_lg_impr_req  on lg_improvement_plans(requirement_id);
create index if not exists idx_lg_impr_law  on lg_improvement_plans(law_id);
create index if not exists idx_lg_impr_dept on lg_improvement_plans(owner_dept_id);
create index if not exists idx_lg_impr_stat on lg_improvement_plans(status);

-- (1ค.1) ย้ายกรณีจริงที่มีอยู่: LA-031, LA-032 (รอประกาศหลักสูตรอบรมผู้ชำนาญการฯ)
--        → แผนปรับปรุง 2 รายการแรกในระบบ owner = Safety (lookup ด้วย law code — ไม่ hardcode id)
insert into lg_improvement_plans (requirement_id, law_id, plan_text, owner_dept_id, owner_name, status, created_by)
select r.id, l.id,
  'ติดตามการประกาศหลักสูตรอบรมผู้ชำนาญการด้านความปลอดภัยฯ จากกรมสวัสดิการฯ แล้วส่งบุคลากรเข้าอบรมและขอขึ้นทะเบียนให้ครบตามข้อกำหนด',
  (select id from lg_departments where name='Safety'), 'Safety', 'open', 'ระบบ (ย้ายข้อมูลเริ่มต้น)'
from lg_laws l join lg_requirements r on r.law_id = l.id and r.status = 'unmet'
where l.code = 'LA-031'
  and not exists (select 1 from lg_improvement_plans p where p.requirement_id = r.id);

insert into lg_improvement_plans (requirement_id, law_id, plan_text, owner_dept_id, owner_name, status, created_by)
select r.id, l.id,
  'จัดทำการประเมินอันตรายและทบทวนทุก 3 ปีตามข้อ 5 — รอประกาศหลักสูตร/แนวทางผู้ชำนาญการฯ เพื่อดำเนินการให้สอดคล้อง',
  (select id from lg_departments where name='Safety'), 'Safety', 'open', 'ระบบ (ย้ายข้อมูลเริ่มต้น)'
from lg_laws l join lg_requirements r on r.law_id = l.id and r.status = 'unmet'
where l.code = 'LA-032'
  and not exists (select 1 from lg_improvement_plans p where p.requirement_id = r.id);

-- ── RLS (permissive public — เครื่องมือภายใน, ควรรัดกุมก่อนเปิดสาธารณะ) ──────────
alter table lg_departments        enable row level security;
alter table lg_assessment_flow    enable row level security;
alter table lg_improvement_plans  enable row level security;
create policy lg_departments_all       on lg_departments       for all using (true) with check (true);
create policy lg_assessment_flow_all   on lg_assessment_flow   for all using (true) with check (true);
create policy lg_improvement_plans_all on lg_improvement_plans for all using (true) with check (true);

commit;
