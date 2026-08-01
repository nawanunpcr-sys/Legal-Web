-- P16 · View รวม "งานที่ต้องทำ" จาก 3 แหล่ง (workflow / report / comm) → คอลัมน์ชุดเดียว
-- อ่านจากที่เดียวจบสำหรับหน้า "รายการที่ต้องทำ" (P17)
-- read-only ต่อข้อมูล: ไม่ drop/แก้ตารางใดๆ · security_invoker=true ให้ RLS ต้นทางยังทำงาน
--
-- หมายเหตุความต่างจาก spec (แจ้งไว้):
--   • ref_id เป็น text — เพราะ lg_law_workflow.id เป็น uuid แต่ lg_reports.id / lg_communications.id
--     เป็น bigint (UNION ต้องเป็นชนิดเดียว) จึง cast เป็น text ทุกแหล่ง
--   • lg_communications ไม่มีคอลัมน์ created_at / updated_at → คืน null สำหรับ comm

-- index เท่าที่จำเป็น (idempotent)
create index if not exists idx_lg_reports_next_due on lg_reports(next_due_date);
create index if not exists idx_lg_communications_next_sched on lg_communications(next_scheduled_date);

drop view if exists lg_tasks;

create view lg_tasks with (security_invoker = true) as
with
-- ── workflow (lg_law_workflow) ──────────────────────────────────────────────
wf (task_id, kind, ref_id, law_id, law_code, law_name, cat, title, subtitle,
    owner_name, due_date, stage, status_raw, state, done_at, created_at, updated_at) as (
  select
    'wf-' || w.id::text,
    'workflow',
    w.id::text,
    w.law_id,
    l.code,
    l.name,
    l.cat,
    coalesce(l.name, w.follow_issue, 'งานทวนสอบกฎหมาย'),
    (case w.workflow_type
       when 'add'     then 'เพิ่มกฎหมายใหม่'
       when 'monitor' then 'ทวนสอบกฎหมายเดิม'
       else w.workflow_type end) || ' · รอบ ' || w.round::text,
    w.owner_name,
    w.reverify_date,
    w.stage::int,
    w.status,
    case
      -- เสร็จแล้ว: 'done' เว้นแต่ถึงรอบทวนสอบใหม่แล้วยังไม่เปิด case อื่น → 'overdue'
      when w.status = 'เสร็จสิ้น' then
        case
          when w.reverify_date is not null and w.reverify_date < current_date
               and not exists (
                 select 1 from lg_law_workflow w2
                 where w2.law_id = w.law_id and w2.id <> w.id and w2.status <> 'เสร็จสิ้น')
          then 'overdue'
          else 'done'
        end
      -- ไม่สอดคล้อง + เลยกำหนดปิดแผน → overdue
      when w.status = 'ไม่สอดคล้อง'
           and w.reverify_date is not null and w.reverify_date < current_date then 'overdue'
      -- กำลังดำเนินการ: ไม่สอดคล้อง / รอประเมิน / อยู่ stage >= 2
      when w.status in ('ไม่สอดคล้อง', 'รอประเมิน') or w.stage >= 2 then 'doing'
      else 'todo'
    end,
    w.completed_at,
    w.created_at,
    w.updated_at
  from lg_law_workflow w
  left join lg_laws l on l.id = w.law_id
  where l.id is null or (l.status <> 'repealed' and l.active is not false)
),
-- ── report (lg_reports) ─────────────────────────────────────────────────────
rp (task_id, kind, ref_id, law_id, law_code, law_name, cat, title, subtitle,
    owner_name, due_date, stage, status_raw, state, done_at, created_at, updated_at) as (
  select
    'rp-' || r.id::text,
    'report',
    r.id::text,
    r.law_id,
    coalesce(r.law_code, l.code),
    l.name,
    l.cat,
    r.title,
    nullif(concat_ws(' · ', r.authority, r.responsible), ''),
    r.responsible,
    r.next_due_date,
    null::int,
    null::text,
    case when r.next_due_date < current_date then 'overdue' else 'todo' end,
    r.last_submitted_at,
    r.created_at,
    r.updated_at
  from lg_reports r
  left join lg_laws l on l.id = r.law_id
  where r.next_due_date is not null
    and (l.id is null or (l.status <> 'repealed' and l.active is not false))
),
-- ── comm (lg_communications) ────────────────────────────────────────────────
cm (task_id, kind, ref_id, law_id, law_code, law_name, cat, title, subtitle,
    owner_name, due_date, stage, status_raw, state, done_at, created_at, updated_at) as (
  select
    'cm-' || c.id::text,
    'comm',
    c.id::text,
    null::bigint,
    null::text,
    null::text,
    null::text,
    c.topic,
    c.assigned_to,
    c.assigned_to,
    c.next_scheduled_date,
    null::int,
    null::text,
    case when c.next_scheduled_date < current_date then 'overdue' else 'todo' end,
    c.last_sent_at,
    null::timestamptz,
    null::timestamptz
  from lg_communications c
  where c.next_scheduled_date is not null
),
u as (
  select * from wf
  union all select * from rp
  union all select * from cm
)
select
  task_id,
  kind,
  ref_id,
  law_id,
  law_code,
  law_name,
  cat,
  title,
  subtitle,
  owner_name,
  due_date,
  stage,
  case kind
    when 'workflow' then case when state = 'overdue' then 'เกินกำหนดทวนสอบ' else status_raw end
    when 'report'   then case when state = 'overdue' then 'เกินกำหนดส่งรายงาน' else 'ถึงกำหนดส่งรายงาน' end
    when 'comm'     then case when state = 'overdue' then 'เกินกำหนดสื่อสาร' else 'ถึงกำหนดสื่อสาร' end
  end as status_label,
  state,
  done_at,
  created_at,
  updated_at
from u;

comment on view lg_tasks is 'P16 · รวมงานที่ต้องทำจาก workflow/report/comm (security_invoker). อ่านจากที่เดียวสำหรับหน้ารายการที่ต้องทำ';

-- DOWN (rollback) — read-only migration; ไม่มีการแก้ข้อมูล
-- drop view if exists lg_tasks;
