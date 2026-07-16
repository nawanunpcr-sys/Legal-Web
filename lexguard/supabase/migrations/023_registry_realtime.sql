-- P10 · Task 6 — expose lg_laws + lg_requirements on realtime so the registry
-- KPI stats (จำนวนกฎหมาย / สอดคล้อง / NC) update live on add/repeal/assess
-- without a page refresh.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='lg_laws') then
    alter publication supabase_realtime add table lg_laws;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='lg_requirements') then
    alter publication supabase_realtime add table lg_requirements;
  end if;
end $$;

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- alter publication supabase_realtime drop table lg_requirements;
-- alter publication supabase_realtime drop table lg_laws;
