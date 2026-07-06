-- Real file attachments for CAR/OFI, government reports, and communications
-- (previously only a free-text file_reference existed).

create table if not exists lg_attachments (
  id bigint generated always as identity primary key,
  ref_type    text not null check (ref_type in ('car','report','comm')),
  ref_id      bigint not null,
  file_url    text not null,
  file_name   text,
  uploaded_by text,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_lg_attachments_ref on lg_attachments(ref_type, ref_id);

alter table lg_attachments enable row level security;
create policy lg_attachments_all on lg_attachments
  for all to authenticated using (true) with check (true);

-- Let a CAR/OFI optionally link back to the law / requirement it addresses
alter table lg_car add column if not exists law_id         bigint references lg_laws(id)          on delete set null;
alter table lg_car add column if not exists requirement_id bigint references lg_requirements(id)  on delete set null;
