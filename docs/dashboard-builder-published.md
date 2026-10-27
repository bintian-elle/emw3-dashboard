# Published Dashboard Builder overviews

The deployment-time remote schedule is Tuesday at 04:00 America/New_York. The local Codex custom automation has been removed; no local recurring job is required. Scheduling is configured only when deploying to the remote host; this module does not install timers or deploy services. The desired report week is the last fully completed Tuesday–Monday week in America/Chicago. At this schedule both zones have advanced to Tuesday. Source account calendars are still independently validated.

## Storage and serving

Each project has `.state/ai-dashboard/projects/<project>/published.json` (mode 0600): `{version:1,project,range,report,generatedAt,sources}`. The report is a validated materialized snapshot, not a definition that gets recomputed when reading. New generation prepares raw caches, validates source identity/coverage, and materializes the report before atomically renaming a temporary publication file. File-mode preview keeps only `published.json`; obsolete `published.previous.json` is removed only after the new atomic write succeeds. Raw dated caches needed for PoP/YoY are retained. These files remain private and outside Git.

The catalog serves the prior publication throughout collection or failure. It does not block on new-period API calls. With no publication, it may bootstrap from existing complete closed-period caches only. All three initial publications were created from the October 13–19, 2026 cached data.

## Catalog response

`GET /api/ai-dashboard/catalog?project=bluevua|biceek|ringconn` returns:

- `project`, `projects`: configured project metadata with actual published readiness and available sources.
- `range`: the **served publication** range.
- `targetRange`: the latest fully completed Tuesday–Monday target.
- `pendingPeriod`: true when the served publication is older than the target.
- `report`: the frozen served report; never replaced with null because new-period collection failed.
- `generatedAt`: publication timestamp, or null before first publication.
- `sources`: metrics for published ready sources; `preparationError` remains null because catalog does not run the source adapters.

The editor should refresh its automatic default period only when `range` changes to a newly published range. Custom report date ranges remain user-controlled. Merely seeing `targetRange` advance must not clear or move the current report.

## Generation command

Run from the frontend repository:

```bash
node --experimental-strip-types scripts/pregenerate-dashboard-overviews.ts
```

Optional flags: `--project <id>` limits to one project; `--cached-only` bootstraps without fetching; `--force` explicitly regenerates an already-published week and is **not** needed in scheduled tasks. A normal new-week generation forces source refresh internally, but a duplicate normal run returns immediately without API calls.

stdout is JSON `{targetRange,results}`. Per-project statuses are `ready`, `already_ready`, `pending`, `busy`, or `failed`. Results include target `range`, `servedRange` when an old publication exists, and `nextEligibleAt` for an unfinished account day. The command exits 0 for successful/idempotent/pending/busy outcomes; any failed project makes exit code 1 while preserving its prior publication. A per-project filesystem lock prevents overlap; abandoned locks expire after an hour.

A scheduled workflow may retry after its Tuesday 04:00 ET start. Never pass `--force` for these routine retries: already-published projects must skip both collection and replacement.

## Publication checks

A source must be identity-verified by the project cache reader, belong to the same project/account allowlist, and retain its native calendar and currency. A previously available source cannot silently disappear in the new snapshot. Current headline metrics must be finite source-backed numbers. Empty or failed API results are not invented zeros.

The publication verifies that source reporting days have finished and cache `fetchedAt` is after the account-local period close; seven rows captured on Monday afternoon do not prove a complete week. If a cache marks `periodClosed:false` or `complete:false`, publication is rejected. Standard timezone aliases are preserved, Microsoft PacificTimeUSCanadaTijuana maps to America/Los_Angeles, and unverified descriptive timezones conservatively use UTC−12. That last boundary may require a later retry even though the workflow starts at 04:00 ET. The old report remains available meanwhile.

All report generation is deterministic materialization of authorized read-only caches. No AI model request is needed, and source marketing data is never modified.

## Existing AI insight database: latest-only production provider

The opt-in store uses a separate `public.dashboard_overview_publications` table in the existing AI insight database. It never writes the EDM `ai_insight_cache` table or marketing source tables. `project` is the primary key, so only one generated overview is retained per brand. A transactional upsert replaces the previous payload only after all validation succeeds; there is no DELETE-first window. Older periods, or an older generation timestamp for the same period, cannot overwrite a newer publication.

Configuration:

```text
AI_DASHBOARD_PUBLICATION_STORE=postgres
AI_DASHBOARD_PUBLICATION_DATABASE_URL=<optional explicit database connection override>
# Without the override, reuse the existing KLAVIYO_DATABASE_URL.
AI_DASHBOARD_PUBLICATION_DATABASE_CA_FILE=<absolute path to the official database CA certificate, when required>
```

Default provider is `files`; simply having `KLAVIYO_DATABASE_URL` configured does not connect to the database. Postgres connections are lazy and only used when explicitly selected, or during the explicit import below. TLS and hostname verification stay enabled; the CA file trusts only the selected provider certificate for this pool. URL options such as ssl=false or sslmode=disable cannot silently override verification. Do not use credential values in documentation, logs, browser bundles or CLI arguments.

Schema preparation is explicit: `sql/dashboard-overview-publications.sql`. Normal catalog reads and publication updates never execute DDL. The new public-schema table has row-level security enabled with no browser-facing policies; backend database-owner connections continue to use it. The existing EDM data remains in its original table. A read failure after a valid database publication was loaded may serve that process's last validated in-memory snapshot instead of clearing the page.

### Import the already-generated local results

Dry run, with no database connection:

```bash
node --experimental-strip-types scripts/import-dashboard-publications.ts
```

For the explicitly authorized initial database import, load the private local environment and opt into the write:

```bash
node --experimental-strip-types --env-file=.env.local scripts/import-dashboard-publications.ts --write --apply-migration
```

The importer validates the three allowed local project publications first. A **single transaction** applies the new table migration, upserts all three project rows, reads each payload back, and verifies its canonical SHA-256 before COMMIT. Any unconfirmed import reports only a safe error code; inspect database state before retrying an ambiguous commit. Without `--write`, no SQL is issued. After confirmed import, the application can explicitly select `postgres` to reuse these generated results at deployment.

Successful database updates retain only the latest per-project row. File-mode bootstrap copies are not read as an implicit fallback when the database provider is selected. Underlying raw source caches are separate and must remain available for comparison, chart editing and read-only AI questions.

Natural-language “Last Week” uses the currently published served period while a new publication is pending; an explicit pair of dates continues to select that exact range. Thus merely advancing the desired week does not force the chat into an unpublished period.
