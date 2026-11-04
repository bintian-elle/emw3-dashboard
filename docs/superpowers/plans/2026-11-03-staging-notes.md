# Staging and page notes implementation plan

Goal: Independently deploy an authenticated team preview with shared page annotations attributed exclusively to the signed-in Google account.

Architecture: Separate checkout/build/process, loopback port 3100 and a dedicated HTTPS hostname. Notes use durable per-record JSON files outside release directories; atomic publication prevents partial reads and concurrent creates never overwrite one another. The server controls author identity. Production has no annotation UI or API. Staging blocks upstream mutation and uses database connections in read-only mode, copied local snapshots, and no separate worker or cron tasks.

Design: A fixed Staging / Notes control opens a Radix dialog listing notes for the current pathname. Add a note enters point-selection mode; clicking a page element captures an element anchor plus relative location and text context. Pins open the corresponding note. Keyboard users can leave a general page note. Each record contains author name/email, date, text, page, context, position and resolution status. Notes remain across deployments. Reuse Nova buttons, semantic colors, language provider and Radix focus management.

Alternatives: Vercel would require migrating host-dependent snapshots and services; full database/worker duplication adds cost. Use an isolated service on the now larger existing server, subject to resource checks, building serially at low priority. DNS and OAuth callback setup may require account access unavailable in this session.

- [x] Add behavior tests for validation, account attribution, concurrent persistence, resolution and staging request restrictions; observe failure.
- [x] Implement notes store, authenticated same-origin API and staging-only page annotation UI.
- [x] Add isolated deployment script and branch-specific workflow; verify production target cannot be selected by staging.
- [x] Run notes/policy tests, TypeScript, targeted lint, production build and browser checks.
- [x] Provision staging service and proxy, verify public access and existing production health; document any external DNS/OAuth blocker.

## Final scope decisions
- User requested account names from login, then explicitly requested reuse of existing login rather than email OTP. Cloudflare Access was inspected but no subscription activated.
- Exact reviewers confirmed by user: bintian.feng@elle-media.com, ivan.he@elle-media.com, fiona.deng@elle-media.com.
- Dedicated short-lived login handoff requires a minimal production patch based on deployed 8afdfc1, independently from the staging feature branch.
- Connection-pool testing showed startup read-only parameters ignored. Replaced with fixed SELECT-only roles, verified on 42 Google and 22 EDM tables. Provisioning uses private ownership receipts to prevent duplicate accounts or takeover of unrelated roles.
- Main auto-production gate separately committed/pushed as workflow-only b3451b7.
- Independent review found no blocker in notes or login handoff; deployment retention and main workflow gate were addressed.

Verification so far: 6 notes/handoff tests and 14 analytics tests passed; TypeScript and targeted ESLint clean. Browser desktop/mobile: persistence, shared notes, resolve/reopen, point pins, same-point additions and active-note scrolling verified, one dialog, no horizontal overflow, no page errors.


## Final implementation and validation

- Public staging provisioned on the existing server with isolated checkout, process, notes storage and SELECT-only database roles. DNS and wildcard TLS work; no extra server was purchased.
- Actual company Google sign-in through production-to-staging handoff verified. No OAuth callback change required. Production receives only the minimal login entry overlay on its previously deployed content base.
- User explicitly disabled automatic deployment after historical failures. Both branches use a manually triggered build-only workflow; staging artifact deployment is a separate manual step. No push-triggered deployment remains.
- User requested permanent feedback access between releases. Same/pending/unknown release status uses recorded verified content revisions. Notes remain available in all states, including report errors. Local approved snapshots seed initial reads; SELECT-only metadata reconciliation follows newly published production data without source refresh or AI generation. Each local seed is used at most once per process, preserving authoritative published deletion behavior.
- Current production content base 8afdfc1 differs from preview de4139e, so initial live status is pending. No false same-version label is applied.
- Final code 713590c: 19 staging/cache regression tests passed, 14 analytics tests passed, TypeScript and targeted ESLint clean. Local browser verified same/pending/unknown labels, mobile layout and notes availability on report errors. Prior desktop/mobile QA verified note sharing, account attribution, anchored notes, resolve/reopen and persistence.

- Manual hosted run #15 (41753019604) succeeded for 713590c. Artifact SHA-256 698f942e3d61e27ffe8b57e3390432a4ad8fb12cbf83d1af61acffe23054a2dc verified before upload; embedded source commit matched. Manually deployed to staging with startup health check and retained rollback build.
- Final authenticated rendered-page check: overview, inventory, Google Search, Meta, Reddit, EDM, Social Media and tracking all HTTP 200 with no streamed error markers. Final public handoff/notes smoke passed all 10 checks, including replay rejection, trusted author, cross-origin rejection, outsider/anonymous denial and no production annotation UI. Temporary verification note removed.
- Actual browser after deployment shows the populated overview, accurate pending status, Bintian Feng account and account-attributed note composer. Empty verification draft cancelled; no personal test note left behind. Local development server stopped and generated tsconfig edits restored.
