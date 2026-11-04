# Team review staging

Website: https://staging.emw3-dashboard.win
Production entry: https://emw3-dashboard.win/staging-review

## Access and notes

Initial reviewers: bintian.feng@elle-media.com, ivan.he@elle-media.com, fiona.deng@elle-media.com. Both hosts configure the exact email allowlist in STAGING_REVIEW_EMAILS. Reviewers use the ordinary production Google login; no extra Google callback is required. Production displays Review staging only to these accounts. Staging starts a browser-bound handoff through production, which issues a signed 60-second, single-use ticket. Staging verifies audience, issuer, expiry, nonce and reviewer before creating a separate host-only session. Both hosts share a dedicated STAGING_HANDOFF_SECRET, while AUTH_SECRET remains distinct. Never log ticket query strings or commit keys.

Staging remains available between releases as a team feedback website. Team notes supports point annotations and keyboard-accessible page notes, captured context, resolve/reopen, and shared updates every 30 seconds while visible. Google identity supplies the author; the client cannot choose a name or email. Notes attach to a pathname without query strings. Changed content retains its note/context without placing a pin on unrelated content. Report errors retain the global notes control.

Durable storage: /home/ubuntu/.local/share/emw3-staging/{notes,preferences,handoff-receipts}. Notes use one atomic JSON file per ID. Back up these directories independently; deployments preserve them.

## Version indication

The toolbar distinguishes same production content/no pending updates, updates ready for review, and unconfirmed version. STAGING_RELEASE_STATUS_FILE points to /home/ubuntu/.local/share/emw3-staging/release-status.json. Missing or malformed metadata never claims that versions match. Version status concerns application content, not the time of the last data refresh. Infrastructure for notes and isolated access is an intentional staging overlay.

After checking the actual published and preview content commits, run in the isolated staging checkout:

```sh
node ops/staging/set-release-status.mjs <production-content-commit> <preview-content-commit> "中文更新说明" "English release summary" "testing-layout,creative-previews,social-post-order,team-feedback"
```

The optional Chinese/English summaries are plain text, each at most 240 characters. Pending releases show a two-line toolbar preview and the full description inside Team notes. Matching/unknown versions hide old summaries. Review each summary against the actual content diff when publishing. The optional final argument lists unique known change IDs from lib/staging-review-changes.ts. The pending release exposes only canonical local links and semantic targets from this catalog. Selecting an item navigates to its page, waits for streamed content, optionally opens the existing analysis expander, and highlights the visible target for 15 seconds. Missing targets report unavailable after 20 seconds, with no substitute target. The status text opens the linked change list; notes remain accessible.

Record equal commits only after the reviewed content has actually been published and both sites use that content. Do not switch the badge alone. Initially production is based on 8afdfc1 with the minimal login overlay; preview contains unshipped business changes through de4139e, so the accurate initial state is pending. Publishing and aligning future content remains manual.

## Data and isolation

Staging runs on the existing host at /home/ubuntu/work/bintian/emw3-dashboard-staging, PM2 process emw3-dashboard-staging, localhost port 3100, DEPLOYMENT_ENV=staging and .staging-checkout marker. Nginx config is ops/staging/nginx.conf; its callback logs omit query strings.

Dedicated emw3_staging_reader roles have SELECT privileges only. Pool connection options alone were ineffective, so database role privileges enforce isolation. RLS read policies in ops/staging/read-only-cache-policies.sql cover only the four published report/cache tables, never the AI job queue or account preferences. Verify nonzero readable snapshots and false INSERT/UPDATE privileges when provisioning.

The versioned STAGING_DATA_SNAPSHOT_DIR seeds report loads from approved local published snapshots. The existing lightweight metadata check observes newly published production data and loads changed snapshots through the read-only connection. Missing periods may read an already published database snapshot; unavailable periods show a report error. Staging never refreshes upstream advertising sources or publishes report data. Google/Meta/Reddit API calls are explicitly blocked even if credentials are accidentally present. Reddit daily cache rows are restricted to their declared report period without changing published headline totals. Export seed snapshots with ops/staging/export-data-snapshots.mjs into a fresh versioned directory; existing directories cannot be overwritten.

Only notes, staging-local language preferences, logout, authentication and explicitly listed read-only report POST endpoints permit mutations. AI generation and source refresh are disabled. No separate staging worker or cron timer is installed. The app's metadata check reuses published data rather than generating new reports.

## Manual publication only

Automatic deployment is disabled at the user's request. .github/workflows/deploy.yml has workflow_dispatch only and produces a staging build artifact; it has no push trigger, SSH transfer or deploy job. A push changes source only. Existing production deploy.sh is separate.

1. Commit and push the reviewed staging source.
2. Explicitly run Build staging (manual only) on codex/staging in GitHub Actions.
3. Download its artifact, verify the digest and embedded .staging-build-commit against the intended source.
4. Upload staging-build-<commit>.tgz into /home/ubuntu/.local/share/emw3-staging/incoming/.
5. Run deploy-staging.sh with that artifact path. The script verifies its isolated checkout/env/source commit, reuses matching dependencies, starts a timestamped build, health-checks it and falls back to the previous staging build if startup fails. Current and previous builds are retained. The no-artifact mode is a low-priority on-host fallback.
6. Check authenticated reporting pages, login, notes, origin protection, reviewer access and production isolation; update the accurate content-version record.

Production currently uses the minimal login overlay built on the deployed 8afdfc1 content base. Its .next-release-login-review symlink points into the isolated emw3-dashboard-login-release directory, which must remain present. The old production build is retained for rollback. Never promote the entire staging branch merely to change login or version metadata.

## Verification

Run staging unit tests, relevant snapshot memory/publication regression tests, analytics tests, TypeScript and targeted ESLint. The manual hosted build must pass. Check real Google-to-staging login, trusted author identity, shared note persistence, point annotations, mobile layout, forbidden origins/mutations, single-use handoff and reviewer rejection. Fetch rendered reporting pages and check streamed error markers as well as HTTP status; Next server-rendered errors can retain status 200.
