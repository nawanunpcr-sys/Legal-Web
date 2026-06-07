# Edge Functions

## `read-law-pdf`
Reads a PDF / law URL (e.g. ratchakitcha.soc.go.th) via a self-hosted
[open-notebook](https://github.com/lfnovo/open-notebook) instance and returns an
AI summary + suggested registry fields. Used by the **Analysis** page.

**To connect open-notebook** set these Edge Function secrets
(Dashboard → Project → Edge Functions → Manage secrets, or `supabase secrets set`):

| Secret | Example | Required |
| --- | --- | --- |
| `OPEN_NOTEBOOK_API_URL` | `https://your-open-notebook.example.com` | ✅ |
| `OPEN_NOTEBOOK_PASSWORD` | the `OPEN_NOTEBOOK_PASSWORD` of your instance | if auth enabled |
| `OPEN_NOTEBOOK_NOTEBOOK_ID` | a notebook id to attach sources to | ✅ |
| `OPEN_NOTEBOOK_SUMMARY_TRANSFORMATION_ID` | transformation id for summarising | optional |

Until these are set the function returns a clearly-labelled placeholder so the UI
still works. Run open-notebook with Docker (see its repo) and expose the API
(default port `5055`) on a public URL reachable by Supabase.

## `shawpat-updates`
Scrapes <https://www.shawpat.or.th/th/other-service/osh-law> for newly released
OSH laws, stores them in `lg_law_updates`, and inserts a `law_update` row into
`lg_notification_log` for each new item (surfaced in the app's notification bell).

- Called from the app's **Analysis → ShawPat updates** refresh button.
- Also runs automatically once a day via `pg_cron` (`shawpat-daily-check`, 01:00 UTC).
- No secrets required (uses the built-in service-role key).
