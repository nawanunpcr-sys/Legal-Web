-- Law Process Tracker: 3-stage per-law workflow + substatus lookup
create table if not exists lg_process_substatus (
  stage int not null, code text not null, label text not null, sort int not null default 0,
  primary key (stage, code)
);
insert into lg_process_substatus (stage,code,label,sort) values
 (1,'pending_search','รอค้นหา',1),(1,'reviewing','กำลังตรวจสอบกฎหมาย',2),(1,'analyzing','กำลังวิเคราะห์',3),(1,'pending_register','รอขึ้นทะเบียน',4),(1,'registered','ขึ้นทะเบียนแล้ว',5),
 (2,'pending_assign','รอมอบหมาย',1),(2,'sent','ส่งให้หน่วยงานแล้ว',2),(2,'in_progress','กำลังดำเนินการ',3),(2,'returned','ส่งกลับ/รอแก้ไข',4),(2,'done','ดำเนินการเสร็จ',5),
 (3,'pending_verify','รอทวนสอบ',1),(3,'verifying','กำลังทวนสอบ',2),(3,'returned_fix','ส่งกลับแก้ไข',3),(3,'passed','ทวนสอบผ่าน',4),(3,'closed','ปิดงาน',5)
on conflict (stage,code) do nothing;
alter table lg_process_substatus enable row level security;
create policy lg_process_substatus_all on lg_process_substatus for all using (true) with check (true);

create table if not exists lg_process_tracker (
  id bigint generated always as identity primary key,
  law_id         bigint references lg_laws(id)          on delete cascade,
  requirement_id bigint references lg_requirements(id)  on delete set null,
  car_ofi_id     bigint references lg_car(id)           on delete set null,
  stage int not null default 1 check (stage between 1 and 3),
  substatus text, assignee_name text, assignee_role text,
  status text not null default 'waiting',   -- waiting | in_progress | done | overdue
  note text, started_at timestamptz, due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lg_process_tracker_law on lg_process_tracker(law_id);
alter table lg_process_tracker enable row level security;
create policy lg_process_tracker_all on lg_process_tracker for all using (true) with check (true);

-- Phase 2 · Realtime (DONE): expose table on the supabase_realtime publication
--   so the client can subscribe to live inserts/updates/deletes.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='lg_process_tracker') then
    alter publication supabase_realtime add table lg_process_tracker;
  end if;
end $$;

-- TODO (Phase 2 - remaining automation, not implemented yet):
--  * trigger: when a linked lg_car row closes -> advance the tracker stage
--  * daily Edge Function: scan due_at overdue -> notification hook (LINE/email)
