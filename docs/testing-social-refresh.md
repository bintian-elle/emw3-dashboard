# Content Testing Social Media scheduled refresh

The local implementation schedules one Social Media API refresh each day at **08:15 UTC**, one hour before the existing Content Testing readouts at **09:15 UTC**. In Chicago this is 03:15 during daylight saving time and 02:15 during standard time. The separate EDM Insights timer at 07:45 UTC is unchanged.

`scripts/refresh-testing-social.mjs` posts once to the fixed loopback-only `/api/testing/social-refresh` endpoint using `CRON_SECRET`, or `AI_WORKER_SECRET` if that is unset. It does not retry a failed request and never writes credentials or response bodies to the log. If a valid shared snapshot was already published that UTC day, the scheduled run skips the API call and retains its timestamp. Otherwise the endpoint fetches and validates the full report before publishing the Social snapshot and timestamp to `testing_data_snapshots`; failed requests leave the previous shared snapshot intact. A manual refresh remains available independently.

`ops/emw3-testing-social-refresh.timer` and `.service` are prepared locally; creating these files does not install or enable the timer on the production host. The website code and the shared snapshot table must be in place first. When deployment is authorized, install both unit files and enable the timer, leaving the existing Testing readout and EDM Insight timers unchanged:

```sh
sudo install -m 644 ops/emw3-testing-social-refresh.service /etc/systemd/system/
sudo install -m 644 ops/emw3-testing-social-refresh.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now emw3-testing-social-refresh.timer
systemctl list-timers emw3-testing-social-refresh.timer emw3-testing-readouts.timer
```

The timer is persistent: a missed scheduled time can run after the host returns. Check the service journal for its completion or rate-limit failure; no failed refresh replaces the prior snapshot. The existing Testing readout loader uses the latest successfully published Social snapshot for the next analysis.

## Review checklist for an isolated production release

This is a release checklist, not confirmation that anything has been deployed. The production checkout inspected on 2026-10-28 was at `b7aaac6`. It did not contain the Social refresh endpoint, shared-cache modules, worker or timer. Its existing `emw3-testing-readouts.timer` was enabled for 09:15 UTC. Recheck the actual revision and timer state before release; they may change.

Build a separate release from the then-current production revision, and apply only the following reviewed files or changes. The exact dependency closure must still pass a production build against that revision:

| Scope | Files or changes |
| --- | --- |
| Scheduled endpoint | `app/api/testing/social-refresh/route.ts`, `lib/testing-social-scheduled-refresh.ts` |
| Shared snapshot | `lib/testing-data-cache.ts`, `lib/testing-data-cache-contract.ts`, `lib/testing-data-publication.ts`, `lib/testing-social-snapshot.ts` |
| Social fetch and reads | `lib/testing-social.ts`, `lib/testing-social-insights.ts` |
| Endpoint authorization | The narrowly scoped `/api/testing/social-refresh` POST authorization change in `proxy.ts`, retaining existing authentication behavior |
| Scheduler | `scripts/refresh-testing-social.mjs`, `ops/emw3-testing-social-refresh.service`, `ops/emw3-testing-social-refresh.timer` |
| Verification | `scripts/refresh-testing-social.test.mjs`, `lib/testing-data-cache-contract.test.ts`, `lib/testing-data-publication.test.ts`, `lib/testing-social-insights.test.ts`, `lib/testing-social-scheduled-refresh.test.ts`, `lib/testing-social-snapshot.test.ts` |

The cache contract also imports `lib/testing-period.ts`, `lib/reddit-content-testing.ts` and the `TestingPeriodInput` type from `lib/testing-google.ts`; the Social loader imports `lib/instagram-posts.ts` and `lib/instagram-paid-metrics.ts`. Those files were present on the inspected production revision, and the relevant period functions were exported. Verify compatibility when building; do not automatically copy their unrelated local modifications. The server needs its existing Instagram credentials, `KLAVIYO_DATABASE_URL` with access to `testing_data_snapshots`, and a matching `CRON_SECRET` or `AI_WORKER_SECRET` for both the application and worker. Verify configuration without printing credentials. Confirm the schema and database permissions before enabling the timer.

The local working tree contains many unrelated and unfinished changes. In particular, it deletes `prompts/insights/content-testing-requirements.json`, `prompts/insights/content-testing-source.md`, and `prompts/insights/content-testing.md`, which the production `lib/testing-readout-refresh.ts` still reads. **Do not include those deletions:** retain the production prompt files and existing readout implementation. The inspected production checkout also had a modified `ops/emw3-ai-queue.service` and untracked `ops/emw3-ai-insights-refresh.service` and `.timer`; preserve these and recheck for other production changes. Never replace the production working tree with the local tree.

The existing `deploy.sh` pulls the branch, builds in the active checkout, and restarts PM2. It does not select this narrow file set, and an in-place build changes the active `.next` while users are served. Prepare and validate a separate release instead; explicitly plan the cutover and rollback for the actual PM2 configuration, and ensure the worker's `WorkingDirectory`, application environment and existing `.state/social/instagram-posts.json` fallback remain correct for the selected release. Do not assume an alternate release directory automatically preserves these paths. The separate release must not alter the existing Testing or EDM timers.

Before enabling the new timer, run the targeted tests and a production build in the isolated release, verify that the deployed endpoint and worker use the same secret and shared database, and check that the endpoint rejects unauthorized requests. Verify a successful snapshot and readout consumption without logging credentials or exposing response bodies. The timer's `Persistent=true` can trigger a missed run immediately on enable or after recovery; account for that before activation. A failed refresh must leave the previous snapshot and timestamp intact. Check the next run and service journal after activation.

This checklist covers the scheduled Social refresh and readout data. The local manual refresh and last-updated UI depend on `app/api/testing/data-refresh/route.ts`, `app/bluevua/testing/testing-data-refresh.tsx`, sidebar changes and other channel adapters; they are not present in the inspected production revision and require a separately reviewed release scope.
