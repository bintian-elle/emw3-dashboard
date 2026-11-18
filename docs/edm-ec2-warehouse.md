# EDM warehouse on EC2

The EDM dashboard reads PostgreSQL on EC2 through `EDM_DATABASE_URL`. The prior `KLAVIYO_DATABASE_URL` remains the fallback for installations not yet migrated and continues to serve unrelated shared application stores. Neither URL belongs in Git.

## Collection and coverage

- `scripts/edm/run.mjs` binds the API connection to the registered Bluevua account and Shopify conversion metric. It pins Klaviyo revision `2026-07-15` to preserve the existing campaign/message IDs; upgrading to the omnichannel campaign API requires a deliberate warehouse migration.
- `scripts/edm/migrate.mjs` copies only the listed EDM tables and the EDM bilingual insight cache, preserving historical facts and verifying row counts. It does not copy credentials, remote functions, policies, or unrelated application tables.
- Account metrics and URL click events use Eastern event dates. Campaign/Flow reporting keeps Klaviyo send-date attribution. Flow values are fetched for each full Eastern day because series responses use UTC buckets. Unique measurements remain native API values; no summing daily uniques to invent period uniques.
- Subscriber inventory uses the existing `All Subscribers` and `SMS_List` segment identities. Historical membership comes directly from Klaviyo segment-series `total_members`, retaining its supplied daily labels; it is not reconstructed from subscription/unsubscription event totals. Existing pre-migration snapshots remain unchanged.
- Each complete fact slice commits in a transaction. A failed fetch or write retains the previous slice. All five domains must have contiguous completed coverage before `dataUpdatedThrough` advances. Valid no-send days are covered by successful source extraction, not by the last campaign send date.
- Failed run domains resume without re-fetching domains completed for the same dates that Eastern day. `--force-domain` allows explicitly rechecking a single domain. PostgreSQL advisory locking prevents concurrent collectors.

## Schedule and notifications

Install and enable `ops/emw3-edm-refresh.service` and `.timer`. The controller checks hourly, collects at **04:00 America/New_York**, and retries a failed collection at **05:00**. Hourly ticks also cover delayed startup and undelivered notices without an unlimited service restart policy that could defer systemd failure alerts. Data attempts are bounded to two per Eastern day, and a successful day's data is not recollected on retry. A pending Slack notification cannot block a subsequent day's collection.

The normal refresh revisits the last 14 complete days for attribution updates, expanding back to the oldest incomplete coverage when necessary. The first backfill starts November 10, 2026. Historical dates before that boundary are retained.

Failure after the retry sends a sanitized domain-level reason to the existing owner DM. Recovery is sent only after all five domains succeed and remains pending if Slack delivery fails. Startup/timeouts receive the existing systemd fallback alert, deduplicated against a notice the collector already delivered.

Private operational state is `.state/edm-refresh/status.json`; extraction receipts are `edm_refresh_coverage` and `edm_refresh_runs` in the local warehouse. Only successful collection advances the completeness date. Database credentials, state, data and environment backups are excluded from Git.

## Manual operations

Run from the project directory with its existing private environment:

```sh
node scripts/edm/run.mjs --start 2026-11-10 --end 2026-11-18 --resume
node scripts/edm/run.mjs --start 2026-11-10 --end 2026-11-18 --resume --force-domain links
```

End dates are exclusive. Never substitute today's partial data for a completed day. Local development uses an SSH tunnel to the same EC2 PostgreSQL warehouse; PostgreSQL itself remains inaccessible from the public internet.

The superseded Supabase `klaviyo-*` cron jobs should be disabled only after the EC2 backfill and deployed website have been verified. Keep their configuration and the former source data available for rollback; do not delete historical data during cutover.
