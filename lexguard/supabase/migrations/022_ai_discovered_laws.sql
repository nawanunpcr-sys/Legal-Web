-- P10 · Task 4 table (created early because Workflow A Process 1 reads from it).
-- lg_ai_discovered_laws = laws the AI search page found & summarised. Workflow A
-- "เลือกกฎหมายที่จะเพิ่ม" pulls its options from here; on register the row is
-- linked back via registered_law_id and flipped to status='registered'.

create table if not exists lg_ai_discovered_laws (
  id uuid primary key default gen_random_uuid(),
  law_name text not null,
  source text check (source in ('ratchakitcha','shawpat','manual')),
  summary jsonb,                     -- สาระสำคัญรายข้อ (editable form)
  announced_date date,
  effective_date date,
  ministry text,
  related_docs text[],
  status text default 'draft' check (status in ('draft','imported','registered','deleted')),
  registered_law_id bigint references lg_laws(id),
  searched_at timestamptz default now(),   -- ใช้แสดง "ค้นหาล่าสุดเมื่อ ..." ใน empty state
  created_at timestamptz default now()
);

create index if not exists idx_lg_ai_discovered_status on lg_ai_discovered_laws(status);

alter table lg_ai_discovered_laws enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='lg_ai_discovered_laws' and policyname='lg_ai_discovered_laws_all') then
    create policy lg_ai_discovered_laws_all on lg_ai_discovered_laws for all using (true) with check (true);
  end if;
end $$;

-- Now that the target exists, add the FK from lg_law_workflow.discovered_law_id
do $$ begin
  if not exists (select 1 from pg_constraint where conname='lg_law_workflow_discovered_fk') then
    alter table lg_law_workflow
      add constraint lg_law_workflow_discovered_fk
      foreign key (discovered_law_id) references lg_ai_discovered_laws(id);
  end if;
end $$;

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- alter table lg_law_workflow drop constraint if exists lg_law_workflow_discovered_fk;
-- drop table if exists lg_ai_discovered_laws;
