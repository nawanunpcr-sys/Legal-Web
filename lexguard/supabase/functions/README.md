# Edge Functions

## `read-law` (not included — build your own)
The **Analysis → อ่านกฎหมายจากลิงก์/PDF** panel calls a Supabase Edge Function
named `read-law` via `summarizeLawUrl()` in `src/lib/integrations.js`.

Build this yourself (e.g. as your own Skill / backend). Contract:

- **Input:** `{ "url": "https://..." }`
- **Output:** `{ "summary": "…", "suggested": { "name", "ministry", "hierarchy_level", "effective_date" } }`

Until it is deployed the UI shows a clear placeholder, so everything else keeps working.

## `shawpat-updates`
Scrapes <https://www.shawpat.or.th/th/other-service/osh-law> for newly released
OSH laws, stores them in `lg_law_updates`, and inserts a `law_update` row into
`lg_notification_log` for each new item (surfaced in the app's notification bell).

- Called from the app's **Analysis → ShawPat updates** refresh button.
- Also runs automatically once a day via `pg_cron` (`shawpat-daily-check`, 01:00 UTC).
- No secrets required (uses the built-in service-role key).
