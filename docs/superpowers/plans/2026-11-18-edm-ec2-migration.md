# EDM EC2 migration implementation plan

> **For agentic workers:** Implement inline using superpowers:executing-plans; preserve unrelated working-tree changes.

**Goal:** Restore EDM reporting after Supabase HTTP 402 by collecting Klaviyo into an EC2 PostgreSQL database and reading it from the website.

**Architecture:** An independent `EDM_DATABASE_URL` selects the EDM warehouse without redirecting other shared stores. Copy existing EDM facts, dimensions and EDM insight cache first. A bounded, sequential Klaviyo collector stages complete slices and commits each validated slice atomically; failed slices retain existing rows and cannot advance coverage. Daily 04:00 America/New_York refresh, 05:00 retry, persistent failure/recovery notifications and an exclusive job lock.

**Tech stack:** Existing PostgreSQL 16, pg, Node, Klaviyo reporting/aggregate APIs, systemd, existing private Slack notifier.

**Spec:** User request in this chat, 2026-11-18: migrate EDM collection/storage/reads to EC2; backfill after November 9; preserve daily refresh/retry/Slack; verify website.

## Global constraints
- No credential output or Git storage; local database binds only to the host.
- Preserve all historical rows and unrelated local work; keep rollback configuration.
- Reporting attribution and account Eastern timezone stay unchanged; no additive approximation of unique recipients.
- No website publication before backfill and read validation succeed.

## Review focus
- Partial API pagination must not replace a complete period.
- Failure midway through a transaction must roll back existing data.
- Invalid or missing measurements must not become fabricated zeroes.
- Host-local database uses the correct SSL policy; shared Supabase users remain unchanged.
- A failed Slack send stays pending; recovery follows a genuine successful refresh.

### Task 1: Source selection and warehouse copy
- [x] Add failing tests for EDM database selection/local SSL, then implement a shared config module and adapt EDM database consumers.
- [x] Build an allowlisted historical copy tool, copy tables to a new local database and compare row counts/date coverage.

### Task 2: Validated collector and backfill
- [x] Add tests for date windows, aggregate/report mappings, pagination completeness and atomic replacement.
- [x] Implement collection of daily account metrics, campaign/flow reporting, subscriber inventory, clicked links and current creative metadata using existing credentials and API throttling.
- [x] Backfill November 10 through the latest complete Eastern day; verify all data domains and actual dashboard reads.

### Task 3: Durable scheduled operation and cutover
- [x] Test daily/retry scheduling and failure/recovery delivery; implement persistent status and exclusive locking.
- [x] Install daily systemd collection with retry and notifications; preserve existing refresh schedules for other channels.
- [x] Run targeted tests/type checks, publish only owned changes, build/restart website, and validate formal/Preview API rendering from EC2 data.
- [x] Disable only the superseded Klaviyo Supabase schedules after validated cutover, retaining their configuration privately for rollback.
