# Dashboard Builder production release

Released on 2026-10-26 (America/Chicago), using the existing ANC host and PM2 application `emw3-dashboard`.

- Dashboard Builder: https://emw3-dashboard.win/ai-tools/dashboard-builder
- Bluevua Website Tracking: https://emw3-dashboard.win/bluevua/tracking
- Dashboard checkout: `/home/ubuntu/work/bintian/emw3-dashboard`.
- Reporting adapters: `/home/ubuntu/work/bintian/slack-ads-report`.
- Production build directory: `.next-release`, selected in the protected production environment. The previous `.next` was preserved during release preparation.
- Marketing caches remain private under `.state/ai-dashboard`; no credentials or source snapshots were committed to Git.

## Authentication and source access

The development-only Builder API gate was removed. Production uses the existing signed site session and user-owned jobs; mutations require exact same-origin requests. Anonymous catalog access returned 401, cross-origin mutations returned 400, and another account could not read a known job UUID (404).

Bluevua, Biceek and RingConn publications are served from the existing insight database's separate `dashboard_overview_publications` table. Current-period API/CLI retrieval was verified on ANC. Biceek GA4, Shopify and Klaviyo work; its Google report remains unavailable with the currently returned empty report, and Meta remains unavailable without the required access. Neither is replaced with zero or another brand's data. Microsoft collection reuses one complete reporting OAuth credential set, avoiding the website login client overriding the reporting client/refresh-token pair.

Content Testing questions use the same Bluevua Content Testing page loaders, campaign/ad inventory and metric contracts. The dedicated read-only tool rejects whole-account query substitution. Concluded lifetimes remain separate. A real AI question produced the dedicated scoped tool receipt without changing the dashboard.

## Brand background and AI progress

Summary, insight and strategy questions can consult the matching `AI-Bluevua`, `AI-Biceek` or `AI-ringconn` profile using its existing brand context documents. All three returned source-backed notes during production-host verification. Consultations use isolated ephemeral processes, bounded allowlisted document reads and disabled external tools. They do not resume employee conversations, write project knowledge or send Slack messages.

Fast service tier and low reasoning are supplied per Builder invocation only. The remote global Codex configuration remains `gpt-6-astra`, maximum reasoning and default tier. Builder privately reuses the host's existing upstream model catalog metadata to avoid a redundant model-discovery wait; account identity is excluded and global configuration is untouched. The local catalog override follows the [official model-catalog documentation](https://learn.chatgpt.com/docs/model-catalogs).

Builder AI queue and processing time have **no fixed elapsed-time cutoff**. Worker heartbeats persist current status/elapsed time and renew the owner lock every 15 seconds, so healthy queued/running work is not mistaken for an abandoned job. Completion or actual worker/provider errors determine the final status. Presentation edits and simple metric lookups skip background consultation.

## Weekly publication

The remote `dashboard-builder-weekly.timer` is enabled and active:

- Tuesday 04:00 `America/New_York`, automatically accounting for DST.
- Bounded hourly completion attempts at 05:00–09:00 Eastern.
- The first scheduled start after release is 2026-10-27 08:00 UTC / 04:00 Eastern.
- One manual idempotence run completed with exit 0 and all three projects `already_ready`.
- A new publication atomically replaces only that project's latest database row after validation. The previous row remains served throughout collection, queueing or failure. Raw dated caches remain available for comparisons.
- No local Codex automation was re-created.

Website Tracking's existing hourly timer remains enabled. Its new cache warmup completed with `refreshed:8, failed:0`.

## Verification

Production compilation/type checking succeeded. Targeted suites cover Builder/editor/history/data access, Content Testing scope enforcement, private model catalogs, brand-profile routing and indefinite waiting, plus Website Tracking and collector cache rules.

HTTPS production smoke checks passed for the three database catalogs, authenticated hydration, page rendering and security boundaries. Real Codex component editing and read-only Content Testing analysis passed on the identical pre-release process. No marketing source writes were performed.

## Granular component appearance (2026-10-27)

AI `style` operations edit a validated per-component `appearance` map, separate from source data: chart data disclosure, metric caption (hide/custom/default), chart legend/grid/data labels, table guide lines/striping/density/header. Existing defaults are preserved. The same map is persisted in IndexedDB, sent in editor context and included in Undo/Redo; weekly hydration preserves appearance while refreshing numbers. Live-DOM PDF capture reflects these styles.

Local UI verification exercised a compound Chinese request hiding chart data and a metric caption while adding table lines/compact rows. It retained every widget and value, supported Undo/Redo, survived reload, then hid the legend, enabled chart labels/both grid directions and removed striping. Browser console was clean. A CLI-version guard prevents a newer model catalog from changing an older CLI's model selection. The local preview may select the already-installed bundled CLI through `AI_DASHBOARD_CODEX_BIN`, without changing global Codex settings.
