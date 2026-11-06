# Team review staging

Website: https://staging.emw3-dashboard.win
Production entry: https://emw3-dashboard.win/staging-review

## Access and notes

Initial reviewers: bintian.feng@elle-media.com, ivan.he@elle-media.com, fiona.deng@elle-media.com. Both hosts configure the exact email allowlist in STAGING_REVIEW_EMAILS. Reviewers use the ordinary production Google login; no extra Google callback is required. Production displays Review staging only to these accounts. Staging starts a browser-bound handoff through production, which issues a signed 60-second, single-use ticket. Staging verifies audience, issuer, expiry, nonce and reviewer before creating a separate host-only session. Both hosts share a dedicated STAGING_HANDOFF_SECRET, while AUTH_SECRET remains distinct. Never log ticket query strings or commit keys.

Staging remains available between releases as a team feedback website. Team notes supports point annotations and keyboard-accessible page notes, captured context, shared unread/read state, and shared updates every 30 seconds while visible. Google identity supplies the author; the client cannot choose a name or email. Notes attach to a pathname without query strings. Changed content retains its note/context without placing a pin on unrelated content. Report errors retain the global notes control.

Durable storage: /home/ubuntu/.local/share/emw3-staging/{notes,preferences,handoff-receipts}. Notes use one atomic JSON file per ID. Back up these directories independently; deployments preserve them.

## Version indication

The toolbar reads an explicit deployment status. After production and staging are both successfully deployed, the production deploy script writes `synced` to clear pending review; after a staging-only update, write `pending` with its summary. No version comparison is required. STAGING_RELEASE_STATUS_FILE points to /home/ubuntu/.local/share/emw3-staging/release-status.json. Missing or malformed metadata remains unconfirmed. Infrastructure for notes and isolated access is an intentional staging overlay.

After checking the actual published and preview content commits, run in the isolated staging checkout:

```sh
node --experimental-strip-types ops/staging/set-release-status.mjs pending "中文更新说明" "English release summary" "testing-layout,creative-previews,social-post-order,team-feedback"
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

Production now uses the independently built AI release f0f98dc on deployed content base 8afdfc1, retaining the login entry and current-page navigation fix. Existing Testing business pages remain on their previously deployed content. The prior .next-release-login-review symlink points into emw3-dashboard-login-release, which is retained for rollback. Runtime release records live in /home/ubuntu/.local/share/emw3-production/current.json. Never promote the entire staging branch merely to change login or version metadata.

## Verification

Run staging unit tests, relevant snapshot memory/publication regression tests, analytics tests, TypeScript and targeted ESLint. The manual hosted build must pass. Check real Google-to-staging login, trusted author identity, shared note persistence, point annotations, mobile layout, forbidden origins/mutations, single-use handoff and reviewer rejection. Fetch rendered reporting pages and check streamed error markers as well as HTTP status; Next server-rendered errors can retain status 200.


## Screenshot notes, reading and deletion

Capture a region freezes the current viewport locally and supports mouse/touch rectangle selection. Review the cropped image and enter a note before Save; cancel does not upload an image. Page note remains the keyboard-accessible alternative. Captures use html2canvas-pro for modern CSS colors and scrolled containers (the existing html-to-image dependency does not preserve container scroll). External resources unsupported by browser CORS may be absent; the preview allows inspection before saving. No screen-sharing permission or external screenshot service is used.

The server accepts bounded raster data only, rejects SVG/fake signatures and excessive pixels, and normalizes captures to at most 1280×960 WebP without metadata. Note JSON contains dimensions only; the authenticated staging-only /api/staging/notes/image endpoint serves the image. Polling does not embed image bytes. The private image file lives beside its note and survives deployment.

Unread/Read reuses the existing shared resolved boolean internally (false/true) to retain existing records; UI wording describes reading, with yellow/green badges and mark-read/mark-unread actions. Author identity still comes exclusively from login. API responses compute canDelete per viewer; it is not accepted from clients or stored as authority.

Only matching author sub or configured STAGING_ADMIN_EMAILS (default bintian.feng@elle-media.com) may delete. DELETE requires the existing same-origin check and reviewer authentication. Deletion privately archives the note and image under notes/.deleted; normal listing and image access stop immediately. Backups include the archive; no automatic permanent purge is installed.


## Verified manual publication

- Production AI artifact: f0f98dcb9066e1935b39e18024fb5f06e1d72fd7, manual run 41763264562, ZIP SHA-256 52c52d7217be5b644808e4ebf1f9615f252df021fe9558404b9868fcdf280f46. Candidate checks passed before the production process was switched; temporary candidate removed afterwards. Existing production credentials/data/worker integration were preserved.
- Staging artifact: 8012d6523ab5987f6dcad1a7b5b4243443451044, manual run 41763277377, ZIP SHA-256 7ecef3a94ce1f15cde1fe0366bb01014b10d26224bd9774bde2a498928d726af. The staging checkout/dependency/artifact check and startup health check passed; durable notes and prior build retained.
- AI tool changes were approved for direct production publication and deliberately omitted from the staging summary and change catalog. Staging still has pending Testing business/review changes, so its status remains pending. The version record now identifies production f0f98dc and preview business base de4139e.
- The bottom-left entry/return controls preserve path, query and fragment. Cross-environment Testing links add the existing shared=1 marker so document navigation retains the selected reporting period; staging consumes that marker after loading.
- Verified 21 staging tests, production backport tests, TypeScript/lint, hosted builds, authenticated public AI pages/font, 8 rendered staging reporting routes with no streamed errors, handoff/replay rejection, private screenshot save/read/delete, trusted authors, cross-origin denial, reviewer denial and production notes isolation. Real Bintian browser navigation verified production Google Search to staging Google Search and back with the same period. Temporary verification notes/images were removed.

Build workflows remain manually triggered and never upload/deploy by themselves. Source pushes do not publish. Production's release branch contains isolated presentation dependencies to preserve the existing Testing UI; main retains the canonical shared-component implementation for future reviewed releases.

## Local PMax readability trial (2026-11-04)

An opt-in local development trial uses the unchanged PMax analytical prompt, followed by `prompts/content-testing/readability.md`. The existing remote Insights thread generates isolated file results, not shared reports. Current trial: Oct 27–Nov 2 compared with Oct 20–26, from the published Nov 3 PMax snapshot.

Set `DEPLOYMENT_ENV=staging`, `STAGING_REVIEW_EMAILS` to the existing reviewer account, `STAGING_DATA_SNAPSHOT_DIR` to the approved local seed directory, and `CONTENT_TESTING_PRESENTATION_DIR` to `.state/pmax-readable-20261104`; start development with a separate `NEXT_DIST_DIR`. The ordinary localhost Google session remains required. For this offline trial, use an unavailable local database connection rather than production credentials. Other reporting periods retain the normal UI. Production and built remote staging ignore the local-only presentation loader/media route.

`prepare-readable.mjs` reconciles PMax group/product data using the production metric functions and registers immutable chart datasets. `prepare-readable-media.py` reads cached source images/videos and records resized raster frames with timestamps and hashes. `run-readable.py` resumes only the existing Content Testing Insights thread, refuses duplicate running composition, and writes its turn ID/result to isolated files. Validate dataset references, metric units, campaign routing, media identity, and coordinate bounds before viewing. No advertising refresh, Slack delivery, cache publication or deployment is part of this trial.

### Structure-preserving expression revision

`readability.md` preserves each channel's original analytical chapters and their order; it only chooses presentation within those chapters. The local PMax chapter catalog is extracted from the unchanged PMax prompt into `presentation-structure.json`. `run-readable.py --edition sections` reuses the saved analysis, dataset registry and media evidence, verifies the analysis hash, and writes a distinct `presentation-sections.json` without rerunning analysis. Keep the preceding presentation until the replacement passes validation. The v2 contract requires chapter IDs on every block and complete, ordered chapters in every required scope. The renderer groups content and navigation by authoritative chapter titles rather than individual findings.

### Autonomous expression revision

`--edition autonomous` reuses the saved analysis and evidence, preserving direction IDs/order while allowing AI-written chapter/navigation labels and freely selected expression within each direction. It writes a separate `presentation-autonomous.json`; validate before activating locally. No analytics rerun or production publication.

### Free composition trial

`--edition freeform` emits v3 documents within the three retained directions, using arbitrary responsive HTML/CSS/SVG rather than the legacy widget palette. It omits previous presentation input. Local sandboxed frames disable scripts and external dependencies; source references remain validated. Existing analysis is unchanged.

### Offline local bilingual AI reports

Local development staging may deliberately point the shared database connection at an unavailable host for the PMax presentation trial. Data snapshot seeds alone do not include AI analysis. To mirror already-published English reports and matching Chinese translations without generating or updating anything online, run `DEPLOYMENT_ENV=staging node ops/staging/export-readout-snapshots.mjs` with the normal readable shared-database connection. The exporter uses a read-only transaction and writes a private versioned `.state/staging-ai-readouts/` bundle plus an atomic active pointer. Do not commit report payloads.

Only development + staging reads this mirror. Production and built remote staging retain the existing shared-cache behavior. Reports use exact requested cache keys; missing periods remain unavailable, and Chinese translations must match the current English source hash. A missing translation retains the normal English fallback flag. Language switching never generates analysis. A failed read ends the loading state and offers Retry. The local PMax composition is Chinese-only; English mode uses the published English report rather than relabeling Chinese text.

## Integrated last-week analysis bundle (not deployed)

The isolated run `20261104-lastweek` under `.state/content-testing-integrated/` sends the channel content prompt and readability prompt in the same native turn. Seven channels, Reddit cumulative, then Overview are generated from the same frozen inputs; English and Chinese are persisted together. No production queue/cache publication is performed.

Run `compile-integrated.mjs <run-directory>` to validate identities, chapters, HTML safety, registered source/media references and media hashes. Only a completed bundle may be selected by the local `active.json`. Production is always excluded. A future staging deployment sets `STAGING_CONTENT_TESTING_REPORT_DIR` to the exact unpacked run directory, reusing `compiled.json`, inputs, prompts, results, media and checksums; do not call AI during deploy. The current instruction is to retain artifacts locally, not deploy.

## Prompts workspace

`/bluevua/testing/prompts` is staging-only. Its allowlisted POST endpoint and reviewer-only Prompts page Ask AI POST are new staging mutation exceptions; advertising refresh and other staging chat writes remain blocked. The catalog includes master/channel/Overview/Readability/manual/translation/Ask AI prompts and their consumers. All configured channels and Overview support analysis trials; completed analyses can be reused for Readability and translation.

`STAGING_PROMPTS_DATABASE_URL` uses the narrowly privileged `emw3_staging_prompts` login. Only the new `staging_testing_prompt_versions` and `staging_testing_prompt_runs` tables are writable. Existing staging report readers and all production report/cache permissions remain unchanged. Versions are insert-only for this login; optimistic parent checks are serialized per prompt. Restoring creates another version. No production activation is offered in this rollout.

The `emw3-staging-prompts` service reads this isolated queue, resumes the existing Bluevua Content Testing Insights conversation serially, and stores results only in the staging run table. It records captured prompts, exact Campaign/date/language, frozen data hash and native turn. Readability reuses a completed analysis and its analytical prompt versions. A queued analysis can reuse fixed data for a fair comparison. No daily generator, Slack delivery or production cache publisher is invoked.

Install schema from `ops/staging/prompts-schema.sql`, grant only SELECT/INSERT on versions and SELECT/INSERT/UPDATE on runs to the dedicated role, and add role-specific RLS policies. Keep its connection private in staging `.env.local`. Install `ops/staging/emw3-staging-prompts.service`; the standard staging deployment keeps the service and its durable `/home/ubuntu/.local/share/emw3-staging/prompt-runs` directory. Preview HTML is validated and rendered in a script-free, network-restricted iframe.

### Local-only Prompt trials

Until the combined release is approved, do not install the staging worker service or deploy the website. Start the worker locally with `DEPLOYMENT_ENV=staging STAGING_PROMPTS_REMOTE=EMW3_ANC_AI node --experimental-strip-types scripts/prompt-lab/worker.mjs`. It reads only the dedicated Prompt queue and sends isolated request/result files to the existing AI Bluevua host over SSH, without modifying a deployed checkout, remote environment file or service. The remote native turn remains resumable by run ID. Local edits to prompts/Insight UI can be reviewed together before a later release.

Prompts trials accept Search, PMAX, Demand Gen, Meta, Reddit, EDM, Social lifetime and Overview scopes. Channel prompts bind the trial scope; shared rules can target a chosen channel. All trials capture immutable prompt versions and exact Dashboard snapshot periods, including explicit comparison dates. Missing snapshots fail visibly without requesting upstream advertising APIs or substituting another period. Overview captures all six testing channels and applies their prompts before synthesis. Translation requires a completed baseline. Reuse preserves the baseline channel and exact comparison range. These local additions have not been deployed.


## November 4 combined staging release

The combined release is authorized for staging only. Period comparison is now enabled in built staging as well as local development. The completed `20261104-lastweek` bilingual report bundle is transferred separately and activated with `STAGING_CONTENT_TESTING_REPORT_DIR`; it does not replace production AI caches. The isolated Prompt worker is installed with its dedicated database credential and uses the existing native Insights thread. Release contents are recorded in `docs/releases/2026-11-04-staging.md`; the staging review status/catalog point to these changes. Prior local-only instructions above describe the trials before this release approval.

Prompts page Ask AI is routed through the same dedicated staging database and native worker, not the production bridge or ai_job_queue. The captured chat question, page content and user-specific history live in the isolated run table and are excluded from the preview list. The worker recognizes chat jobs, returns a concise answer and interrupts the recorded native turn when a user stops it. Other staging chat contexts remain blocked.

### Local readability correction (not deployed)

`20261104-lastweek-readable-v2` preserves the original analyses, adds exact prior-week Reddit testing-ad data and reconciled comparison datasets, and recomposes only presentation. Reusable interactive chart slots live inside freely composed HTML; the host owns event handlers, with generated scripts still disabled. The original batch and artifact remain available for audit. No production cache write or deployment is involved.

### Local shared-renderer trials

Development staging runs use `.state/prompt-runs-local/` and the same `insight-presentation-v3` report contract, frozen datasets, media references and `InsightPresentation` renderer as channel pages. Both languages are generated together with the selected channel prompt plus readability. Existing legacy previews are marked as legacy; they do not emulate interactive charts through an iframe.

Start one isolated local consumer with `DEPLOYMENT_ENV=staging STAGING_PROMPTS_LOCAL_QUEUE=1 STAGING_PROMPTS_REMOTE=EMW3_ANC_AI node --experimental-strip-types scripts/prompt-lab/worker.mjs`. Its queue and lock are local; it does not consume the shared staging queue or require a remote service update. Captured media is copied into each trial before submission and served through the authenticated staging trial-media route.

Overview freezes the newest completed, full-channel trial matching the reporting/comparison ranges, falling back to the saved channel Insight. Source provenance is displayed with the result. Social lifetime is explicit; Reddit lifetime is excluded from weekly paid totals. Unavailable sources are not replaced with unrelated periods or re-analyzed channels.

Readability's old stored revision was explicitly removed at the user's request; the current file is the only retained Readability baseline. Trial credentials remain insert-only for prompt versions: this one-time cleanup used an existing maintenance connection without changing grants. A newly deployed source baseline is offered ahead of older saved revisions; explicit selected versions remain bound to each submitted run.

### Current staging-only readable report rollout

The active bilingual bundle is `20261104-all-direct-v3`: Search, Demand Gen, Meta, Reddit weekly/lifetime, EDM, Social and Overview were regenerated with channel prompt + current readability in one turn; the accepted latest direct PMax result is retained. The bundle is standalone, includes reconciled prior-week values and verified media/source links, and replaces the earlier staging report directories. No AI runs during deployment.

New preview records use the same validated report envelope and renderer as channel Insights. Overview reuses matching completed trials before saved channel Insights and records seven source selections. The retained account preview is `c490cf4f-1b6b-4ca7-a7b4-4d73b2ccb7b1`; its completed result and author identity remain in the dedicated staging table. Old-format/old-readability trial rows are removed without deleting private Ask AI conversations or production published readouts.

This rollout intentionally does not update `release-status.json` or the pending-review change catalog. Production services, source checkouts, release records and analysis caches remain untouched.
