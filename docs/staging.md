# Team review staging

URL: https://staging.emw3-dashboard.win
Production entry: https://emw3-dashboard.win/staging-review

Reviewers initially: bintian.feng@elle-media.com, ivan.he@elle-media.com, fiona.deng@elle-media.com. Only exact configured emails qualify; the ordinary Google login on production remains the identity provider. The production layout shows Review staging only to these users. Opening staging starts a browser-nonce-bound login handoff via production; no new Google OAuth callback or Cloudflare Access subscription is needed.

Both hosts set STAGING_REVIEW_EMAILS (comma separated) and the same dedicated STAGING_HANDOFF_SECRET (at least 32 characters). Their AUTH_SECRET values remain different. Production /staging-review issues a signed 60-second ticket only for a logged-in reviewer. Staging verifies issuer/audience/expiry/nonce, records the ticket ID once in STAGING_HANDOFF_RECEIPTS_DIR, and issues its own host-only site session. Reverse-proxy access logs should suppress query strings for the callback to avoid retaining short-lived tickets. Never log or commit keys.

Staging checkout: /home/ubuntu/work/bintian/emw3-dashboard-staging
Process: emw3-dashboard-staging, bound to 127.0.0.1:3100.
Environment: DEPLOYMENT_ENV=staging. Sentinel: .staging-checkout.
Durable review storage: /home/ubuntu/.local/share/emw3-staging/{notes,preferences,handoff-receipts}. Back this directory up independently; deployment does not delete it.

Notes belong to a pathname (query filters are intentionally omitted), retain captured element context and relative position, and support resolve/reopen. The server assigns Google name/email/sub; the client cannot choose an author. Each note is atomically published in its own JSON file. Teams see other reviewers' updates on reopening/refresh and every 30 seconds while the page is visible. Changed element content is left unpinned but the note and context remain in the list. Page notes provide a keyboard alternative to point selection.

Staging uses copied local report/material snapshots and dedicated SELECT-only emw3_staging_reader database roles. Startup connection options alone were found ineffective behind the connection pool; role privileges are the write boundary. Only SELECT on existing public tables is granted; new tables require an explicit read grant. No worker, timer or live AI bridge is installed for staging. HTTP mutations are denied except notes, staging-local language preferences, logout and explicitly listed read-only POST report endpoints. AI chat/generation and refresh are unavailable by design.

Deployment workflow: push codex/staging updates staging only. The workflow-only production gate was separately committed to main (b3451b7), so main pushes do not automatically publish. Production uses the manual workflow on main with target=production. deploy-staging.sh verifies its checkout marker/branch/env, uses a distinct timestamped build, health-checks the new service, and retains two timestamped staging builds. Existing production deploy.sh remains separate.

The initial production login patch must use the currently deployed base 8afdfc1 plus only lib/staging-access.ts, lib/staging-review-policy.ts, app/staging-review/route.ts, components/application/staging/review-link.tsx, and the one layout import/render. It must not promote the full staging branch. Preserve the prior production build and PM2 configuration for rollback.

Validation: node --experimental-strip-types --test lib/staging-access.test.ts lib/staging-notes.test.ts; npm run test:analytics; npx tsc --noEmit; targeted ESLint; production builds; authenticated desktop/mobile notes interaction; real production-to-staging login; read-only role privilege verification; production and staging smoke checks.
