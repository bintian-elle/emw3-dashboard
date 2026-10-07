# Bluevua Dashboard persistent conversations

Deployed and enabled in production on 2026-10-07 after user authorization.

## Routing and history

The website derives the Ask AI owner from the verified Google session. SHA-256 of the issuer namespace and Google `sub` forms the stable owner key; email is title metadata, not authorization. Browser-supplied owner, email, cwd and native thread IDs are never forwarded.

- Ask AI: one native conversation per Google subject. Title: `Bluevua · Dashboard Ask AI · <email>`.
- Insights and dependent suggested questions: one shared native conversation. Title: `Bluevua · Dashboard Insights`.
- Native cwd: `/home/ubuntu/work/emw3-anc/bluevua`, using the existing native Codex daemon and home.
- Private mapping and readable turn projection: `conversations.sqlite3` in the configured Dashboard Bridge state directory. Existing jobs and native rollouts remain separate records.
- `GET /api/klaviyo/ask/history` verifies the session and fetches only its owner's latest 100 turns. Refresh restores these messages. Clear view clears the browser display; it does not delete remote history or create a new conversation.

Both native starts and resumes apply existing thread-local tool restrictions. Background loading is server-owned, without arbitrary caller paths: 17 allowlisted Markdown files including inherited rules, project indexes, brand, marketing, KOL, design and Q4 activity context. Each is dated and hashed, reread every model turn. Private `.local`, credentials, unrelated projects and symlinks are excluded. Current report metrics always come from the current Dashboard snapshot. Project documents provide dated background and methodology, not substitute metrics or approvals. This integration does not fetch source links or grant external tool access.

Memory list/confirm/disable responses are also saved in the private readable history even when returned directly without a model turn. Memory proposals that use the model retain the native turn as well. Team-memory scope and exact latest-message authorization are unchanged.

## Reliability

The existing website worker and Bridge execute serially. Idempotent job submissions reuse the same job; cached Insights do not append turns. Native thread identities are saved before awaiting completion. A restart or uncertain execution blocks that conversation for reconciliation, preserves its mapping/history and never silently creates a replacement thread. A missing/archived native thread also fails closed. Existing ephemeral records cannot be retroactively converted into a personal native conversation, and no legacy history is assigned to Google users without evidence of ownership.

## Activation

Remote implementation is in `/home/ubuntu/work/anc-dashboard-bluevua-dev`, branch `codex/dashboard-bluevua-conversations`. The dirty production Bridge checkout was preserved as the development baseline. Bridge task-only delta and the website source snapshot were published directly after user authorization. No Git commit/push was performed. Production Bridge, website and worker were restarted; shared Slack and native Codex services were not restarted.

1. Release the reviewed Bridge delta first; use its existing operational backup/idle checks and restart only `anc-dashboard-bridge.service`. Do not restart shared Slack or native Codex services.
2. Deploy the website's Google login and conversation changes after real company-account OAuth verification.
3. Set `CODEX_BRIDGE_CONVERSATIONS_ENABLED=true` in the website environment. Keep Google credentials, session secret, AI_WORKER_SECRET, CRON_SECRET, database and Bridge settings. Reload website and worker environments through the deployment process.
4. Verify two company-account questions share the same remote thread and email title; a second account gets a separate thread; page refresh restores only its own messages. Verify logout and Insights service authentication.

Keep the flag disabled against the old strict Bridge schema. Existing cache/job keys are unchanged; enabling this feature does not regenerate old Insights.

## Verification

- Complete Bridge simulated regression: 383 tests passed, including account isolation, stable mappings, restart uncertainty, memory-command history, restricted start/resume, context refresh, idempotency and all four Bot observer exclusions.
- Real native probe with synthetic report data: two Ask AI turns reused one durable Bluevua thread, recalled the earlier marker, and retained the email title and native history.
- Separate real native probe: Insights and five suggested questions reused a dedicated durable thread, distinct from Ask AI.
- Website TypeScript and targeted backend lint passed; identity/session unit tests passed. EDM UI lint has the same pre-existing set-state-in-effect, purity and dependency findings as the baseline; this change adds none.
- Production build passed. Real company Google login, logout, re-login and account header were verified in the browser. Two website questions under an isolated synthetic test identity passed through the production queue/worker to the same persistent native thread; trusted email title and different-account history isolation passed.
- Worker and daily 07:45 UTC timer are active. Configuration-only scheduled-refresh check passed; existing Insights caches were not regenerated.
- Protected rollback artifacts: `/home/ubuntu/work/bintian/.dashboard-ops-backups/release-20261007` (old sources/build/dependencies/environment and consistent Bridge SQLite backups). Test history is labelled `integration-test@elle-media.com`, separate from real user history.
