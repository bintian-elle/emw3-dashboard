# Dashboard AI queue

`ai_job_queue` is the durable source of execution state. Only
`scripts/ai-queue-worker.mjs` submits requests to the remote Bridge. A transaction
advisory lock serializes workers; an unresolved running row blocks new remote
submissions. Interactive questions have priority over pending background jobs.

Summary IDs include language, reporting dates and comparison dates. Repeated page
requests reuse the same row and frozen analytics snapshot. Each remote request
has a persisted UUID. An uncertain submission is retried with that same UUID;
accepted requests are polled using their saved remote ID. The Bridge guarantees
idempotency for matching request IDs and bodies.

Completed Insights are saved in the queue before suggested questions are queued.
The worker calls the local summary route to validate and publish the completed
pair to `ai_insight_cache`. This proceeds even after a browser disconnects.
Browser summary requests return 202 while pending and poll every five seconds.
Ask AI uses the same queue and streams heartbeat comments while waiting.

The daily 07:45 UTC refresh advances English, then Chinese. Old cache cleanup only
runs after both language caches succeed. Queue failures preserve completed stages;
failed tasks are not silently recreated by page refreshes. Diagnose the recorded
failure before explicitly authorizing another remote execution.

Deployment requires applying `supabase/migrations/20260929_ai_job_queue.sql`,
installing `ops/emw3-ai-queue.service` into systemd, and enabling the service.
Restart the worker after changing its code or server environment. Its environment
is loaded from the project using `@next/env`, not embedded into the unit.

Monitor with `systemctl status emw3-ai-queue.service` and
`journalctl -u emw3-ai-queue.service`. Inspect queue metadata without printing
request bodies, which can contain attachments and business data.

This queue serializes Dashboard requests only. Other Bridge clients, such as
Slack, can still consume the shared remote service capacity. HTTP 429 responses
are retried with backoff; existing remote tasks are never duplicated for a
temporary status-query failure.

## Same-host migration (verified 2026-10-05)

Website checkout: `/home/ubuntu/work/bintian/emw3-dashboard`. Node runtime:
`/opt/node-v24.21.0-linux-x64/bin/node`. Bridge listens at
`http://127.0.0.1:8788`; the old `18788` tunnel URL does not apply here.
The checked-in unit now uses these paths and orders after the local Bridge.

Migration diagnosis: latest question remained queued with no remote_id and no
updates; no AI queue worker/service existed on the destination. A queued job is
not evidence that Codex accepted it. The user confirmed the old host was deleted; no old worker remains.

Before enabling the migrated worker, set CODEX_BRIDGE_URL to the local 8788 URL
in the destination's server environment, retain the matching Bridge key, and
verify the deployed authentication generation: the current remote checkout still
uses SITE_ACCESS_KEY for finalization; the local Google-login implementation
uses AI_WORKER_SECRET instead. Do not replace remote code with the unpublished
Google-login version merely to restore the queue.

Install the corrected service only after the environment and previous worker are
verified, using the destination checkout's reviewed unit:

```sh
sudo install -m 644 ops/emw3-ai-queue.service /etc/systemd/system/emw3-ai-queue.service
sudo systemctl daemon-reload
sudo systemctl enable --now emw3-ai-queue.service
systemctl status emw3-ai-queue.service --no-pager
```

Existing queued requests are consumed with their original request IDs. Do not
ask the user to resend or delete queue records to recover this migration.
Website configuration reload is separate from worker startup and should follow
the normal manual deployment process. The user authorized this repair: the destination environment was backed up and corrected to 8788, the systemd unit was installed/enabled, and the existing question resumed under its original request ID. No local application updates were pushed and Google login remains unpublished.
