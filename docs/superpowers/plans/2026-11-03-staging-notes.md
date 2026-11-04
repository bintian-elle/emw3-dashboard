# Staging and page notes implementation plan

Goal: Independently deploy an authenticated team preview with shared page annotations attributed exclusively to the signed-in Google account.

Architecture: Separate checkout/build/process, loopback port 3100 and a dedicated HTTPS hostname. Notes use durable per-record JSON files outside release directories; atomic publication prevents partial reads and concurrent creates never overwrite one another. The server controls author identity. Production has no annotation UI or API. Staging blocks upstream mutation and uses database connections in read-only mode, copied local snapshots, and no worker or timers.

Design: A fixed Staging / Notes control opens a Radix dialog listing notes for the current pathname. Add a note enters point-selection mode; clicking a page element captures an element anchor plus relative location and text context. Pins open the corresponding note. Keyboard users can leave a general page note. Each record contains author name/email, date, text, page, context, position and resolution status. Notes remain across deployments. Reuse Nova buttons, semantic colors, language provider and Radix focus management.

Alternatives: Vercel would require migrating host-dependent snapshots and services; full database/worker duplication adds cost. Use an isolated service on the now larger existing server, subject to resource checks, building serially at low priority. DNS and OAuth callback setup may require account access unavailable in this session.

- [x] Add behavior tests for validation, account attribution, concurrent persistence, resolution and staging request restrictions; observe failure.
- [x] Implement notes store, authenticated same-origin API and staging-only page annotation UI.
- [x] Add isolated deployment script and branch-specific workflow; verify production target cannot be selected by staging.
- [ ] Run notes/policy tests, TypeScript, targeted lint, production build and browser checks.
- [ ] Provision staging service and proxy, verify public access and existing production health; document any external DNS/OAuth blocker.

## Final scope decisions
- User requested account names from login, then explicitly requested reuse of existing login rather than email OTP. Cloudflare Access was inspected but no subscription activated.
- Exact reviewers confirmed by user: bintian.feng@elle-media.com, ivan.he@elle-media.com, fiona.deng@elle-media.com.
- Dedicated short-lived login handoff requires a minimal production patch based on deployed 8afdfc1, independently from the staging feature branch.
- Connection-pool testing showed startup read-only parameters ignored. Replaced with fixed SELECT-only roles, verified on 42 Google and 22 EDM tables. Provisioning uses private ownership receipts to prevent duplicate accounts or takeover of unrelated roles.
- Main auto-production gate separately committed/pushed as workflow-only b3451b7.
- Independent review found no blocker in notes or login handoff; deployment retention and main workflow gate were addressed.

Verification so far: 6 notes/handoff tests and 14 analytics tests passed; TypeScript and targeted ESLint clean. Browser desktop/mobile: persistence, shared notes, resolve/reopen, point pins, same-point additions and active-note scrolling verified, one dialog, no horizontal overflow, no page errors.
