# Testing Ask AI: AI Bluevua → AI Design

This integration changes the Dashboard Bridge only. The website continues sending its verified user-owned `bluevua-testing-chat` question and receiving `{answer_markdown}`. No Next.js build/restart is required. The Testing prompt is read from disk for each new question; sync it to the website checkout without rebuilding. Existing answers and daily analysis/translation jobs are unchanged.

## Routing and delivery

- AI Bluevua keeps its existing native conversation. On authenticated Testing questions only, its internal structured answer includes an optional `design_handoff.brief`. Performance questions, copy/brief preparation, recommendations merely mentioning a new creative and capability questions return normally without Design execution.
- Actual visual/design/prototype/review requests are passed to a fresh native thread in `/home/ubuntu/work/emw3-anc/design`. The latest user text, frozen Dashboard context and uploaded attachments travel with the prepared brief. No Slack sender, channel, OAuth identity or Slack handoff is fabricated. Host approvals and Design delivery rules remain in effect.
- The original Bridge job stays running while Design works. The final verified Markdown and accessible delivery links are returned as its existing Answer, so website history, server queue persistence and browser caching work without an additional UI/API schema. Later Bluevua turns see the final answer through supplied chat history. Design does not automatically post to Slack.
- Design has its own journaled thread/turn identity. It never overwrites the user's Bluevua conversation mapping. Shared Dashboard runtime capacity is acquired sequentially, not nested.
- Ordinary question timeouts remain unchanged. Once a Design brief is accepted, only that job's scoped deadline is extended to at most one hour. Stop cancels the active downstream turn and cleans temporary image files.

## Persistence and uncertain execution

The private `${DASHBOARD_STATE_DIR}/design-handoffs.sqlite3` journal records owner, request ID, brief hash, native IDs, status and final result. The directory/file remain private and never enter Git. Exact completed requests reuse their saved result. Duplicate, conflicting, interrupted or uncertain executions are not silently restarted; unresolved jobs block further Design work for the same owner until reconciled.

For reconciliation, inspect the journaled native thread/turn read-only and confirm its terminal status and any created artifacts first. Do not delete the row or clear its owner merely to retry. Existing Website/Bridge unknown-execution rules still apply. Failed Design execution returns an honest message to the same chat; it must not claim a completed design or invent a delivery URL.

## Runtime installation

Apply against the audited Bridge version, not an arbitrary new checkout:

1. Copy `ops/testing-design-handoff-runtime.py` into `src/anc_bridge/dashboard/design_handoff.py`.
2. Dry-run then apply `ops/bridge-testing-design-handoff.patch` with `patch -p1`. This narrowly changes `provider.py` and `service.py`; preserve all other live Bridge deltas.
3. Copy `ops/test_testing_design_handoff_runtime.py` into `tests/` and run the targeted Dashboard/translation/input regressions in the Bridge venv.
4. Back up affected files and wait until the Dashboard Bridge has no queued/running jobs before restarting only `anc-dashboard-bridge.service`. Do not restart shared Slack or native Codex services.
5. Sync `prompts/ask-ai/testing.md` to the website checkout. Do not rebuild Next.js or rerun shared readouts.

Keep these runtime assets in the Dashboard GitHub repository using a skip-ci commit, as with the independent translation runtime. A normal Dashboard website deployment does not overwrite the sibling Bridge runtime; these files allow controlled restoration on a Bridge reinstall. If the patch no longer applies, reconcile with the current implementation instead of overwriting it.

## Verification, 2026-10-27

83 targeted Dashboard/readout/input/translation/handoff tests passed. The real native read-only probe executed Bluevua and Design in distinct threads, returned `DESIGN_HANDOFF_READONLY_OK` with an actual layout recommendation, and persisted the completed Design answer in its isolated private QA journal. The HTTP integration test returns the unchanged Answer shape and records that final answer in the same owner-scoped history. QA did not request file creation, publication, Slack messages or performance API calls.
