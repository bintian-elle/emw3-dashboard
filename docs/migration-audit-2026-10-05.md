# Same-host migration audit — 2026-10-05

Read-only production audit after the separately authorized worker repair. No code push, Google login rollout, new Insights generation, reboot or service restart performed.

Verified:
- Public HTTPS certificate verifies; HTTP redirects to HTTPS; protected root redirects to login; unauthenticated business API returns 401.
- Nginx, Bridge and AI worker active/enabled; PM2 enabled with saved website cwd `/home/ubuntu/work/bintian/emw3-dashboard`. Autostart configuration verified, no reboot exercised.
- Origin certificate is Cloudflare Origin CA, expires 2041-10-01; public certificate verification passed via Cloudflare. It is not a browser-trusted direct-origin certificate.
- Bridge URL is `http://127.0.0.1:8788` and authenticated job reads work.
- Google and EDM database connection checks pass. Google overview GET and EDM dashboard POST return 200 with no error object.
- Main channel pages and Testing Overview return 200 without a detected streamed error digest. This is HTTP/source verification, not a complete interactive browser regression.
- Representative optimized image previews from Reddit, Meta and Google return 200/image/jpeg. Not every asset/video was inspected.
- English and Chinese last-week caches last generated 2026-10-05 07:50:59 UTC, latest expiry 2026-10-13. Recent Insight/suggestion/question jobs complete.

Missing:
- No `emw3-ai-insights-refresh.timer` or equivalent cron was found on the new host.
- `CRON_SECRET` absent from website `.env.local`; current refresh route requires it.
- Repository `ops/emw3-ai-queue.service` on the remote checkout still has the old cwd `/home/ubuntu/emw3-dashboard`; installed live unit is correct. Reinstalling the stale file would regress the repair.

Required follow-up: configure a private cron secret, install the refresh service/timer at the original 07:45 UTC cadence using the new cwd/runtime and existing Access Key version, and synchronize the worker unit template without publishing unrelated local changes. Reload website configuration under explicit authorization. Do not remove existing cache or invoke generation simply to test installation.
