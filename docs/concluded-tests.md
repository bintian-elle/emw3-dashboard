# Concluded tests

The sidebar group starts collapsed. Overview counts explicitly concluded tests; campaign delivery status is not used to infer conclusions.

Definitions live in `config/concluded-tests.json`. The Brand Search test maps to database experiment `10061342243` (`Brand_PagePosition_Test_2026/7/30`), whose treatment campaign is `EM-Search-Brand-Mar25 Brand_AbsTopPageTest_2026/07` and control campaign is `EM-Search-Brand-Mar25`. Its recorded lifetime is July 31–September 23, 2026.

`node scripts/concluded-test-snapshots.mjs` reads the authoritative experiment start/end dates and both arms from PostgreSQL. It waits until end date + 10 calendar days (UTC), aggregates only the test lifetime, validates both arms and daily coverage, and requires every source row to have been synchronized on or after the deadline before publishing an immutable final JSON snapshot. Older data is saved provisionally, visibly labelled, and remains eligible for replacement after backfill. Subsequent runs skip finalized snapshots before any database query for that test. Page rendering reads these files only, without calling databases or advertising APIs.

The current warehouse last changed on September 30, before the October 3 deadline, so the initial local snapshot is provisional and still requires upstream lifetime backfill. The initial archive was captured after the ten-day deadline; its actual capture time is displayed. This is a snapshot of the current warehouse, not a historical claim that a fetch happened on October 3. Upstream Google Ads synchronization must backfill conversion attribution for the lifetime dates before collection; the collector does not call Google Ads itself.

Private snapshots default to `.state/concluded-tests`, outside Git; `CONCLUDED_TEST_SNAPSHOT_DIR` can specify a persistent directory. Back up and preserve that directory across deployments and host migrations. Do not delete archives as build caches. There is no automatic expiry or refresh.

The service/timer templates in `ops/emw3-concluded-tests.*` check daily at 08:00 UTC, retrying incomplete/failed collection on later runs. They have **not been installed or enabled**: current changes are local only. A future deployment must copy existing snapshots to the persistent destination, configure upstream attribution backfill, then install/enable the timer. Future channels require their own collector and renderer; the currently registered test is Google Search only.

Collection uses a per-test exclusive lock and atomic file publication. If the process is killed, verify it is stopped before removing a leftover `.lock` file.

The archive card displays the lifetime range and a separate conclusion date (experiment end date), with a purple Concluded badge. Technical snapshot/backfill status remains internal and is not shown below the card. Snapshots also retain daily arm metrics: Google Testing Performance shows this concluded test when the selected reporting range overlaps its lifetime, recomputing metrics from only selected days. It does not substitute lifetime totals for a partial reporting period or request Google Ads again.

Google Testing Performance now uses the three confirmed Nonbrand content-testing campaigns: `EM-Search-Nonbrand-Purchase-Apr26`, `EM-Search-Nonbrand-TIS-April26`, and `EM-Search-Nonbrand-Competitor-IS-Jun25`. All dimension-registered ad groups are displayed, including zero-activity groups for the selected period. Content-testing groups do not receive invented A/B or control/treatment labels. They sort by first recorded campaign activity (newest first), independent of reporting dates, with concluded experiments appended last. The separate Testing Overview retains its existing data scope.
