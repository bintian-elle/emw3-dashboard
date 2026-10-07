# Google company login

Implemented 2026-10-01; deployed and real company-account sign-in verified 2026-10-07.

## Google Cloud setup

Create a Web application OAuth client in the company Google Cloud project. Prefer an Internal audience under the elle-media.com Workspace organization. Request only `openid email profile`.

Authorized redirect URIs:

- Production: `https://emw3-dashboard.win/api/auth/google/callback`
- Local development (if needed): `http://localhost:3000/api/auth/google/callback`

Configure these server-only variables in the website environment:

```dotenv
GOOGLE_CLIENT_ID=<web-oauth-client-id>
GOOGLE_CLIENT_SECRET=<web-oauth-client-secret>
AUTH_URL=https://emw3-dashboard.win
AUTH_SECRET=<random-secret-at-least-32-characters>
AI_WORKER_SECRET=<different-random-service-secret>
```

The existing `GOOGLE_LOGIN_CLIENT_ID`, `GOOGLE_LOGIN_CLIENT_SECRET`, `GOOGLE_LOGIN_AUTH_URL` and `GOOGLE_LOGIN_AUTH_SECRET` names are also supported. Standard names above take precedence. For local testing with a production URL in `.env.local`, run `AUTH_URL=http://localhost:3000 npm run dev`.

Generate secrets in the secure server environment; do not put real values into Git, chat or logs. The website and AI queue worker must use the same AI_WORKER_SECRET. Keep CRON_SECRET and existing database/Bridge variables. SITE_ACCESS_KEY is no longer used and can be removed after migration. Restart/reload both website and queue worker through the approved deployment process; deploy.sh only restarts the website.

## Behavior

Google authorization code flow uses signed short-lived state, nonce, PKCE and Google's JWKS signature verification, audience, issuer and expiry checks. The callback requires email_verified=true, hd=elle-media.com and an exact elle-media.com email domain. The authorization request's hd hint alone is never treated as authentication.

Signed HttpOnly SameSite=Lax site sessions last seven days. Production cookies require HTTPS. Every protected page/API request verifies the session; unauthenticated APIs return 401 and pages redirect to /access with a validated local return path. Old Access Key cookies cannot grant access. Auth routes are public; automated refresh uses CRON_SECRET and workers use AI_WORKER_SECRET only for POST summary requests to /api/klaviyo/ask. These service credentials never produce a browser session.

The root layout displays the Google display name, email and Sign out button on authenticated pages. POST logout requires the configured origin and clears both current and old cookies. It signs out of this website, not the user's Google account. Google sub is retained as stable identity for Bluevua Ask AI conversation ownership; see `ai-bluevua-conversations.md`.

## Validation before release

- Company account logs in and returns to the requested page.
- Gmail/other Workspace domains cannot access pages or APIs.
- Tampered, expired and legacy cookies do not authorize requests.
- All page families show the account header; logout blocks subsequent navigation and API requests.
- Insights refresh and queue finalization work with their service credentials; those credentials cannot access business pages or submit question mode.

2026-10-07 local verification: configured credentials reach Google's sign-in page with the localhost callback. Domain/session tests, protected routes, legacy login rejection and OAuth redirect checks pass. Real company-account login and logout still require interactive verification. Local session signing secret was replaced with a random value meeting the minimum length. Production was subsequently updated on 2026-10-07. Real company-account Google login, logout, re-login and account header were verified; protected pages/APIs, legacy cookie rejection and limited worker credentials passed production smoke checks.
