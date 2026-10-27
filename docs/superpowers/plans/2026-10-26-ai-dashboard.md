# Local AI Dashboard implementation plan

User approved implementation: local only, fixed September snapshot, remove Agent links; Dashboard on the left and natural-language conversation on the right.

Architecture: Next.js routes create owner-scoped local filesystem jobs. A detached worker runs Codex CLI with a read-only snapshot MCP query tool, validates its JSON widget specification and query receipts, and computes chart data on the server. No platform API, database refresh, arbitrary SQL, code rendering or remote queue writes.

1. Contract and snapshot tool: test September boundaries, missing sources, metric permissions, weighted ratios, invalid chart fields and missing query receipts; implement reader and validator.
2. Job pipeline: persist queued/running/completed/failed tasks; authorize owner reads and same-origin writes; run Codex with structured output and timeouts; validate results and query provenance.
3. UI: replace home Agent links with /ai-tools; add tools catalog and responsive dashboard canvas with conversation on the right; render validated metrics, trends and tables, follow-up edits, JSON export, progress and error states.
4. Verification: run contract tests, TypeScript and targeted lint; verify actual Codex MCP flow and rendered local desktop/mobile interactions. Leave existing unrelated changes intact. No deployment.

Date policy: calendar dates explicitly shown; Last month is September 2026 using 2026-10-26 as the clock. Last 30 days resolves to September 26–October 25 and must fail with an actionable range warning rather than silently substitute September.

Completed: all four tasks. Nine contract/regression tests pass; TypeScript, targeted ESLint and git diff whitespace checks pass. Two real Codex tasks verified 7-widget generation and preservation plus an eighth EDM widget. Local browser QA passed, including refresh recovery, JSON export, date rejection, theme toggle and mobile layout. Independent review's September subrange issue was fixed with a RED→GREEN regression test. No deployment was performed.
