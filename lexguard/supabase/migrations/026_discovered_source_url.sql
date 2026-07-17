-- P10 · AI Edge Functions — reconcile lg_ai_discovered_laws with the edge-function
-- payloads. The table already exists (migration 022) with lg_laws.id as BIGINT and
-- public RLS, so we do NOT re-run the provided create-table SQL (its uuid FK on a
-- bigint PK would fail, and its `to authenticated` policies would block the anon-key
-- app). We only add the one column the AI flow needs.

alter table lg_ai_discovered_laws add column if not exists source_url text;

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- alter table lg_ai_discovered_laws drop column if exists source_url;
