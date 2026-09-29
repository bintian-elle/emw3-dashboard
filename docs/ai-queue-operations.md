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
