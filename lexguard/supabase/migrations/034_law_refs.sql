-- 034 · Skill 3 (osh-law-relate) — cache ตัวบทของกฎหมายที่ถูกอ้างถึง
--
-- ปัญหา: กฎกระทรวงความร้อน แสงสว่าง เสียง 2559 ออกตามความใน พ.ร.บ.ความปลอดภัยฯ 2554
-- แต่ไม่เขียนซ้ำว่าผู้ตรวจวัดต้องขึ้นทะเบียน (อยู่ใน ม.9 ของ พ.ร.บ.แม่) จป. ที่อ่าน
-- เฉพาะกฎกระทรวงจึงตกข้อกำหนดโดยไม่รู้ตัว · ตารางนี้เก็บผลค้นตัวบทของฉบับที่ถูกอ้าง
-- ไว้ใช้ซ้ำ (CACHE_DAYS=180) เพื่อไม่ต้องยิง web_search ใหม่ทุกครั้งที่สรุปกฎหมาย
--
-- idempotent ทุกจุด

create table if not exists lg_law_refs (
  id uuid primary key default gen_random_uuid(),
  ref_key text unique not null,        -- normalizeRefKey() — "พ.ร.บ.ความปลอดภัย พ.ศ. 2554|มาตรา9"
  ref_law_name text not null,
  ref_clause text not null,            -- 'ทั้งฉบับ' เมื่ออ้างทั้งฉบับ
  resolved_text text,                  -- สรุปสาระของส่วนที่ถูกอ้างถึง (≤500 ตัวอักษร)
  requirements jsonb default '[]'::jsonb,
  source_url text,                     -- ต้องอยู่ใน TRUSTED_DOMAINS เท่านั้น
  confidence text,                     -- high | medium | low
  note text,
  resolve_status text check (resolve_status in ('resolved','not_found','manual')),
  resolved_at timestamptz default now()
);

create index if not exists idx_lg_law_refs_key on lg_law_refs(ref_key);

alter table lg_law_refs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='lg_law_refs' and policyname='lg_law_refs_all') then
    create policy lg_law_refs_all on lg_law_refs for all using (true) with check (true);
  end if;
end $$;

-- ชื่อกฎหมายต้นทางของข้อกำหนดที่ดึงมาจากฉบับอื่น · null = ข้อของฉบับหลักเอง
alter table lg_requirements   add column if not exists from_related_law text;
alter table lg_import_staging add column if not exists from_related_law text;

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- alter table lg_import_staging drop column if exists from_related_law;
-- alter table lg_requirements   drop column if exists from_related_law;
-- drop table if exists lg_law_refs;
