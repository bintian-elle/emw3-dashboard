# Website Tracking Background Cache Plan

**Goal:** Serve tracking pages from private persistent snapshots instead of waiting for GA4 queries.
**Architecture:** Keep the existing read-only live reader and exact date/device scopes. Add atomic, permission-restricted snapshots with a one-hour TTL, cross-process refresh locks, failure cooldown, and last-good retention. Next `after` refreshes custom/cold scopes; an independent app timer prewarms the four default device scopes hourly. The page polls only while a background update is pending and displays the data timestamp.

- [x] Test scope isolation, fresh/stale reads, concurrent refresh, failure retention, partial rejection and corrupt-file recovery.
- [x] Implement the persistent cache and separate the raw reader so the app and worker share one implementation.
- [x] Add background status/polling and hourly default-scope warmup using an app service/timer.
- [x] Run tests, type/lint/build checks, compare live baseline and warm-cache load time, and deploy the verified fix.

No credential copies, source-system writes, AI inference, changes to existing Insights jobs, or aggregation of device Users. Cache data stays in ignored `.state/website-tracking` with 0700 directories/0600 files. Failed or incomplete refreshes do not replace successful snapshots. Kernel-held advisory locks release automatically when their worker exits, including crashes; app and scheduled workers share the same lock.

Released as `d62b53c`. Production build passed. Linux cache tests passed (7/7). Server-side authenticated acceptance confirmed four cached scopes with correct labels; overall repeat request 5.60s versus 21.13s baseline, device requests 2.41–3.03s. A cold custom scope returned preparing state in 4.15s and then successfully populated after the response. The independent hourly timer is active; existing operational files retain their original checksums. Browser session transfer was rejected by automatic approval review; validation stayed on the server.
