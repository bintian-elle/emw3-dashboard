# Bluevua Dashboard persistent conversations

Deployed and enabled in production on 2026-10-07 after user authorization.

## Routing and history

The website derives the Ask AI owner from the verified Google session. SHA-256 of the issuer namespace and Google `sub` forms the stable owner key; email is title metadata, not authorization. Browser-supplied owner, email, cwd and native thread IDs are never forwarded.

- Ask AI: one native conversation per Google subject. Title: `Bluevua · Dashboard Ask AI · <email>`.
- Insights and dependent suggested questions: one shared native conversation. Title: `Bluevua · Dashboard Insights`.
- Native cwd: `/home/ubuntu/work/emw3-anc/bluevua`, using the existing native Codex daemon and home.
- Private mapping and readable turn projection: `conversations.sqlite3` in the configured Dashboard Bridge state directory. Existing jobs and native rollouts remain separate records.
- `GET /api/klaviyo/ask/history` verifies the session and fetches only its owner's latest 100 turns. Refresh restores these messages. Clear view clears the browser display; it does not delete remote history or create a new conversation.

Dashboard no longer supplies a restricted base prompt, tool-disable flags, file allowlist or a read-only/no-network turn sandbox. New native threads inherit the host Codex configuration and Bluevua project instructions, including available source tools. Host approvals remain host decisions. Ask AI sends the user's question without an application-wide evidence-only instruction. EDM Insights alone load `prompts/insights/edm.md`; other dashboards and Ask AI do not load that analytical prompt. Original-source freshness depends on what Codex actually retrieves; answers must not imply a live source was read when only a project summary was consulted.

The prompt is read when a new Insights job is created. It contains the complete six-page `docs/EDM Prompt.pdf` text as the primary guidance, followed by the existing diagnostic refinements. Editing it does not alter an already queued job or cached result. Synchronize local edits to the production path listed in `prompts/insights/README.md`.

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

### Streaming endpoint follow-up

The first publication bundled PDF.js with an absolute path to the staging dependency directory. Moving dependencies into production caused the streaming route to fail during module initialization (`DOMMatrix is not defined`), before a question entered the queue. Restoring dependency resolution recovered the route. The permanent build configuration externalizes `pdf-parse`, `pdfjs-dist` and `@napi-rs/canvas` so Node resolves the deployed modules at runtime.

An authenticated request through the public production streaming endpoint completed with a real Google document link and saved a third turn under the synthetic test email. The initial probe omitted required reporting labels and was rejected by Bridge; the successful probe used the same complete fields as the page. No real user's failed question was automatically resubmitted.

The rebuilt website passed authentication checks after removing the temporary dependency-path link. A PDF probe extracted its text and reached Bridge, exposing a second issue: a loaded native thread could return its previous full-access sandbox despite restricted resume parameters. Bridge correctly rejected it before starting a model turn. The remote SDK fix explicitly uses `thread/settings/update` for that service-owned thread, resumes again and checks the resulting sandbox; each Dashboard turn also sends a read-only/no-network sandbox and `approvalPolicy: never`. Two real cross-connection resumes retained the original thread and passed permission checks. Shared Slack/native services and their permissions remain unchanged.

The remote SDK fix passed all 384 Bridge tests and was published with consistent SQLite backups under `native-resume-fix` in the protected release backup directory. Only the synthetic test mapping was unblocked after verifying its failed job had neither a native thread identity nor a turn identity recorded. The public streaming endpoint then completed a synthetic PDF question on the original durable conversation.

Its next text-only turn recalled the PDF marker. Both answers completed through the public streaming route and history returned six test turns (including the retained failed test), with the trusted synthetic email title. No Git commit/push was performed.

### 2026-10-07 native tools and prompt update

The independent Bridge worktree is `/home/ubuntu/work/anc-dashboard-native-prompts-dev`. New native validation conversations successfully retrieved the original Google document through MCP. The website restores historical answers with a visible end-of-history boundary and keeps suggested questions below the conversation. Previous restricted-thread verification above records historical behavior, not the current policy.

Legacy service-owned Dashboard threads retain their original native ID and history. Their old persisted base prompt and loaded tool configuration are reconciled with host defaults on an idle resume; active turns are never unloaded. A real legacy-thread probe retrieved Google document metadata after migration. The captured native base instructions are stored only in the protected host state directory, not in the website or browser. Bridge regression: 386 tests passed.

The previous Bridge execution timeout of 180 seconds interrupted the first full-prompt Insights regeneration. After confirming the native turn was interrupted, only that shared Insights mapping was unblocked for an explicit retry. Production `DASHBOARD_TIMEOUT_SECONDS` is now 1200. Existing successful caches remain visible during generation; authorized replacement occurs only after both languages and their suggested questions have succeeded.

Full-prompt regeneration completed at `2026-10-08T02:02:25.073Z`: current Last Week `2026-09-29`–`2026-10-05`, comparison `2026-09-22`–`2026-09-28`. Both languages contain five Insights and five suggested questions. Both task snapshots exactly match the complete six-page Markdown prompt. Existing cache rows were replaced together in one transaction and read back successfully from the website API. Previous cache/task rows and generated outputs remain in protected host backups under `full-edm-prompt-refresh` and `full-edm-prompt-refresh-retry1`. The English direction warning was reviewed as a heuristic false positive about relative resilience and an AOV offset.

### Bilingual single-pass generation

New EDM jobs use `bilingual_insights`: one English analysis followed by its faithful Simplified Chinese translation, with five suggested questions in each edition, returned in one native turn. The shared queue ID is language independent (`summary:bilingual:<period>:<comparison>`). English and Chinese UI/API callers therefore join the same job. Both editions are parsed before publishing either and saved in one database transaction; existing valid caches continue to serve ordinary refreshes. Legacy task formats remain supported. AI defaults to Chinese after page reload; its language switch stays available.

The prior native turns inherited `gpt-6-astra / max`. Successful model execution took approximately 299s English analysis + 43s English questions + 230s Chinese analysis + 28s Chinese questions. This change removes the second analysis and both standalone question requests without changing host model/effort, tools, project access or Slack settings. Full regression: 389 Bridge tests passed.

Real synthetic native validation returned both editions and five questions per language in exactly one native thread/turn (86 seconds; a small contract probe, not a production-report latency benchmark). Production build and TypeScript checks passed. The new website and Dashboard Bridge are deployed; host model/effort and shared Codex/Slack services were unchanged. Existing successful report caches were preserved.

Production browser verification at `https://emw3-dashboard.win/bluevua/edm` (existing Chrome through Playwright; Browser plugin unavailable): default Chinese rendered, English selection updated the visible heading, reloading restored Chinese, and no page runtime errors occurred. Public history and both cached language responses returned 200; existing cache timestamps remained unchanged. Both real native editions passed the website parser. Daily refresh configuration check passed without submitting a new report.
