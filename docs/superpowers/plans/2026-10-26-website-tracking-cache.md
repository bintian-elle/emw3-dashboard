# Website Tracking Background Cache Plan

**Goal:** Serve tracking pages from private persistent snapshots instead of waiting for GA4 queries.
**Architecture:** Keep the existing read-only live reader and exact date/device scopes. Add atomic, permission-restricted snapshots with a one-hour TTL, cross-process refresh locks, failure cooldown, and last-good retention. Next `after` refreshes custom/cold scopes; an independent app timer prewarms the four default device scopes hourly. The page polls only while a background update is pending and displays the data timestamp.

- [x] Test scope isolation, fresh/stale reads, concurrent refresh, failure retention, partial rejection and corrupt-file recovery.
- [x] Implement the persistent cache and separate the raw reader so the app and worker share one implementation.
- [x] Add background status/polling and hourly default-scope warmup using an app service/timer.
- [ ] Run tests, type/lint/build checks, compare live baseline and warm-cache load time, and deploy the verified fix.

No credential copies, source-system writes, AI inference, changes to existing Insights jobs, or aggregation of device Users. Cache data stays in ignored `.state/website-tracking` with 0700 directories/0600 files. Failed or incomplete refreshes do not replace successful snapshots. Kernel-held advisory locks release automatically when their worker exits, including crashes; app and scheduled workers share the same lock.
