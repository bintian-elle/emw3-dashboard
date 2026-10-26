# Website tracking dashboard

Route: `/bluevua/tracking`, linked alongside Ads, EDM and Testing on the Bluevua project homepage.

## Data connection

The dashboard reuses AI Bluevua's existing server-installed read-only GA4 tool:

`/home/ubuntu/.agents/skills/anc-ga4-data-readonly/scripts/anc-ga4`

Override the install path with `GA4_CLI_PATH` only when necessary. Each query is fixed to `ga4.bluevua`, and the adapter checks property `451107071` before displaying results. Credentials stay within the tool's controlled loader. No OAuth secrets are copied to this application. When the local executable is absent, set `GA4_SSH_HOST` to the existing trusted SSH host (this Mac uses `EMW3_ANC_AI`). Queries and full report exports then travel over that server-side SSH connection. Browser requests cannot choose a host, account, command or export path. The application prefers the installed local executable on the connected Linux server. Google credentials remain on that server.

AI Bluevua's GA4 integration uses a separate marketing read-only OAuth connection. The dashboard's existing Ads OAuth token lacks Analytics scope; this does not indicate that the AI data connection is unavailable.

Dates in the interface include both endpoints; the adapter converts to the CLI's exclusive end date. Default dates are the last seven complete dates in America/Juneau. All reports filter to `bluevua.com` and `www.bluevua.com` and apply the selected device. CLI calls run sequentially under its shared query lock. Reports are bounded to 1,000 rows; partial results display a warning. The full JSONL export is read when the terminal preview is truncated; its metadata header is excluded.

Registered dimensions verified live on 2026-10-25: `customEvent:feature_source`, `customEvent:feature_action`, `customEvent:feature_result`, `customEvent:entry_point`.

Event, distinct-user and product-unit metrics are separate. Results include success, failure and unverified outcomes. Summed event ratios are not labeled sequential funnels, and purchase-source attribution is not described as causal lift.

## Validation

- Initial five unit tests: date validation, device/host filters, zero denominator, full exports and metadata-header exclusion.
- Targeted ESLint, TypeScript and production build passed.
- Live adapter verification covered all four reporting queries, complete exports and empty purchase-source handling without report errors or coverage warnings.
- Local Chrome: page identity, device filter URL/state, desktop and 390px mobile layouts; no page errors or horizontal page overflow. Initial QA covered the disconnected-host state; subsequent end-to-end QA on the running Mac dev server verified actual GA4 metrics and populated reports through SSH. Browser plugin not available; used bundled Playwright with installed Chrome.
- Independent code review found no significant actionable findings.

No deployment, credential change, Slack message, or background schedule was performed.

## Local connection fix (2026-10-25)

The initial implementation only invoked a CLI on the current host. A Mac dev server therefore displayed a missing-tool message despite successful Linux-only data checks. The transport now supports the explicitly configured existing SSH connection and reads full exports on their originating host. No remote service or credential copy was added. Five transport regressions cover fixed-account commands, SSH target validation, export path restrictions and failure states; all ten tracking tests pass. Independent review found no significant actionable issues.

## Device overview and scope labels (2026-10-26)

The top four overall KPIs use an ungrouped GA4 query (`totalUsers`, `eventCount`, `addToCarts`, `ecommercePurchases`) with the same production-host and selected-device filter as every detailed report. These cover all production-site activity, while the existing Compare/feature cards retain their event-specific scope. Add to Cart and Purchases are event counts; item quantities stay in item reports.

All devices adds a separate `deviceCategory` query. Its stacked event-share preview and detailed device table are both displayed directly; there is no device-metrics expansion button. Specific-device selections do not request or render the breakdown. All returned categories are retained, including any unexpected category. Overall Users is never computed from device-row totals. Live validation confirmed that independently queried overall Users differs from the sum of device-row Users. Source attribution remains separate from the overall purchase event KPI.

Every detailed report and the overall overview visibly names its scope (`All devices · Combined`, `Desktop only`, `Mobile only`, `Tablet only`). Definitions for Events/Users/Quantity and non-additive Users/unmatched Success Rate rules are in an initially collapsed section. The Reporting context panel has been removed; the selected reporting period remains in the page header.

The installed BoardUI registry has no accordion/disclosure component. The disclosures compose existing BoardUI Button, Card and Table components with accessible expanded state and controlled regions. No dependency was added. Twelve tracking tests, TypeScript, targeted lint and an isolated production build passed. An independent review found no significant actionable findings.

Rendered verification for the device update: the All devices page showed the live stacked event-share bar and successfully expanded the device table and definitions, with five combined-scope labels (overview + four reports). The Mobile page showed device-filtered live KPIs; all five scope labels read Mobile only, Device Breakdown was absent, all four device selector options were available, and a 390px viewport had no horizontal page overflow or page errors. Browser checks used the local dev server's localhost origin.

## Refresh defaults (2026-10-26)

Browser reloads of a filtered tracking URL clear its date/device query and section hash, restoring All devices and the last seven complete property-time-zone dates. A layout-level client guard checks navigation timing only once per document; ordinary filter changes, deep-link navigation and history traversal keep their selected scope. The page's Refresh button also clears selections before fetching defaults; on the default URL it refreshes data normally. Other dashboard pages and saved theme/language preferences are unaffected. Thirteen tracking/transport tests, TypeScript and targeted lint passed.


## Persistent background cache (2026-10-26)

Page rendering reads private snapshots without awaiting GA4. Cache keys include property, exact date range and device; the live reader and independent overall Users query are unchanged. Snapshots expire after one hour. Stale data remains visible while Next `after` updates it; cold reports show a preparing state and poll every five seconds until ready. Failed or partial updates retain the last successful snapshot, with a five-minute retry cooldown. The header retains the source retrieval timestamp.

Snapshots live in ignored `.state/website-tracking` (directory 0700, files 0600), optionally overridden with `WEBSITE_TRACKING_CACHE_DIR`. Atomic rename prevents partial reads. Kernel advisory locks coordinate the web app and worker, recovering automatically after process exit: Linux requires `/usr/bin/flock`, macOS `/usr/bin/lockf`. No OAuth credentials are copied into cache or repository.

`node --experimental-strip-types scripts/website-tracking-cache-worker.mjs --check` validates imports/configuration without querying GA4. Without flags it warms missing/stale default scopes; `--scheduled` refreshes All devices, Desktop, Mobile and Tablet sequentially. The independent `ops/emw3-website-tracking-cache.service` and `.timer` run hourly on the connected server. Install these two units, reload systemd and enable the timer; existing AI/Insights schedules are unaffected. Custom periods warm on first access.

Validation: 157 unit tests passed, including cache isolation, stale reads, concurrent refresh, failed/partial retention, corrupt-file recovery, abandoned-lock contention and worker-crash recovery. TypeScript and targeted ESLint passed. Before caching, an authenticated production HTML fetch took 21.13 seconds.
