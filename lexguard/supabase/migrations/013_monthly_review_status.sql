-- Monthly law-scan review status — lets the monthly check record *why* a
-- month is checked (no new laws found vs. new laws found and sent into the
-- process tracker) instead of just a bare checked boolean.
-- Note: lg_compliance_months.checked_at already exists (migration 001) and is
-- reused here — only `status` and `checked_by` are new.

alter table lg_compliance_months add column if not exists status text
  check (status in ('no_new_laws','has_new_laws'));
alter table lg_compliance_months add column if not exists checked_by text;

-- RLS: no new policy needed — lg_months_all (migration 001) is `for all
-- using (true) with check (true)`, which already covers the new columns
-- since RLS policies apply per-row/table, not per-column.
