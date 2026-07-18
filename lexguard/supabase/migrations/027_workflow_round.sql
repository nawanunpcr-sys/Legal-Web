-- P11 · Phase B · รอบที่ N ของแต่ละกฎหมายใน tracker (lg_law_workflow)
-- idempotent: รันซ้ำได้ปลอดภัย
alter table lg_law_workflow add column if not exists round int not null default 1;

-- backfill: กฎหมายที่มีหลายแถว → ใส่ round ตามลำดับ created_at (เก่าสุด = 1)
update lg_law_workflow w
set round = t.rn
from (
  select id, row_number() over (partition by law_id order by created_at) as rn
  from lg_law_workflow
) t
where w.id = t.id and w.round <> t.rn;

create index if not exists idx_lg_law_workflow_law on lg_law_workflow(law_id);
