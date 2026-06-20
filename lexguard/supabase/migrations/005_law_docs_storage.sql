-- Storage bucket for original law documents (PDF) + source_url on laws
alter table lg_laws add column if not exists source_url text;

insert into storage.buckets (id, name, public)
values ('law-docs','law-docs', true)
on conflict (id) do update set public = true;

drop policy if exists "law_docs_read" on storage.objects;
drop policy if exists "law_docs_write" on storage.objects;
create policy "law_docs_read"  on storage.objects for select using (bucket_id = 'law-docs');
create policy "law_docs_write" on storage.objects for insert with check (bucket_id = 'law-docs');
