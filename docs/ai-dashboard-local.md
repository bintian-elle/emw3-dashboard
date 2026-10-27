# Chart-focused refinement and browser theme sync

This supersedes the earlier presentation-frame styling below. User clarified that reference fidelity concerns the charts, not PPT decoration. Removed asymmetric blue card borders, orange corner dots, title rules and tinted card shadows; neutral 1px borders/white canvas remain. Line charts now use straight segments, no area fill, top legends, horizontal gridlines and compact axis labels. Bars are square; small bar sets show value labels. Default metric series use observed Google/Meta chart colors (spend blue, purchase/revenue orange); user color overrides remain intact. ROAS differs across historical examples (yellow in July/August, green in October), so it is not claimed to have a universal historical color. Existing EDM PoP/YoY badges remain per the user's earlier explicit requirement.

User-requested remote Codex investigation ran through ANC-EC2 in read-only/ephemeral mode and located 2026-08-12 deck `1lCCvzzC4FRSTxNCsbt7RwCEOJ8rXNlzF15z5voDVdDU` (Google `g3f66cec9c9a_3_0`, Meta `g3f6d8f156ea_1_0`) and 2026-07-29 deck `1Mi9J4kTIRGkOaAN5g4RAlJ5DsGg4U0iOI3P_Fea8KeY` (Google WoW `g3f951bdb0a5_1_0`). The remote could read structured content but could not view thumbnails due to sandbox network restrictions; those specific Google/Meta pages were subsequently visually inspected in the local browser. Historical native table formatting was verified remotely; platform screenshot tables are neutral, so no universal blue-header rule is assumed. No remote service/source/Drive modifications or deployment.

The complete toolbar (project selection, Add text, Undo/Redo, PDF) is inside the left editing column, while the right chat starts at the same top edge. Project selection is centered relative to the editing column. At narrower widths the action row wraps to prevent overlap. Project selection sits outside the live report capture node: PDF starts directly with the advertiser/report title, without the selector or its empty space. Tooltips and active dots are disabled while exporting. Verified explicit SVG series colors survive PDF rasterization; report background remains white in application dark mode.

Theme detection now treats legacy `boardui:theme` as an old resolved-mode cache, not an explicit preference. New `boardui:theme-preference` defaults to auto; the pre-hydration bootstrap and shared initializer use the same rule, even when storage is blocked. The existing account toggle still permits an explicit saved override; a browser appearance change resets it to auto. Media-query changes, focus and cross-tab updates refresh the mode. Root CSS color-scheme is kept in sync; report surface explicitly stays light. The account-header component/layout itself is unchanged.

# Deck styling and editable text blocks

Reference: 10/21/26 Bluevua <> EMW3 Weekly Meeting Deck, Google Slides ID `11h40x_ESeZvVRY1IjbHQPG2pDKecMG9fdwd6pAtOeEo`. The connector was unavailable, so the original deck was read through Google Slides and exported once as PDF. All 47 slides were reviewed in a contact sheet; pages 4, 7 and 10 supplied the analytical styles. PDF font/color operators confirmed Overpass regular/bold/extrabold, heading blue RGB 56/101/220, table blue 66/133/244 and orange 246/125/38. These are presentation-only semantic tokens; Overpass is bundled locally with OFL license. The shared account header is unchanged. The report and drag overlay remain white in both application themes. Chart colors set by the user remain intact; uncustomized series use deck blue/orange. Live-DOM PDF capture preserves this white canvas and the actual text, series colors and layout.

Text blocks are independent presentation objects with title/content, not marketing datasets. A factual summary based on current visible data is added below the title once; manual deletion is respected across reloads. Add text creates an editable note; titles are visible and editable inline (Enter/blur saves, Escape cancels; empty title restores the previous title). Body edits save on blur or Ctrl/Cmd+Enter. Manual and AI add/edit/delete/move operations share the full workspace Undo/Redo and IndexedDB persistence. Renaming an automatic summary preserves automatic data refresh; editing its prose makes it manual. AI can also rename and rewrite these blocks. Limits: 24 data components plus 24 text blocks; titles 150 characters, bodies 10,000 characters. No HTML is interpreted.

Verified in local browser: default summary, Add text, multiline content, AI add/update/move text, delete/Undo, atomic AI Undo/Redo and refresh persistence. Inline title rename, Undo/Redo and reload persistence were also verified. PDF exported while the application was in dark mode contains a white RGB 255/255/255 canvas, summary and edited titles with deck typography; no account/chat chrome or component handles are exported. Source data remains read-only; no deployment was performed.

# Local conversational component editor

The chat now edits the current report's validated configuration, visible order, hidden state and per-series colors. Plans support atomic add/update/remove/move/color operations; queries return answers without modifying the canvas, Undo, or Redo. Empty reports are supported, with up to 24 components. All numeric rows are recomputed through the existing read-only backend query function; client state and AI output cannot supply row data, SQL, URLs or marketing mutations. Missing/current-period caveats remain in the chat, not the canvas.

Manual delete, drag/keyboard order and color selection share full workspace snapshots with AI transactions. Undo/Redo restores report definitions, materialized data, order, visibility and colors together. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z work outside text fields; chat also accepts Undo/Redo/撤销/重做. New edits clear the redo branch; read-only questions do not. Monotonic revisions reject stale AI edits. Controls that mutate the report are locked while an AI task or drag is active.

Each project's workspace, full history/future and conversation are saved in IndexedDB (`emw3-dashboard-builder` / `workspaces`) with queued writes; recent conversations are bounded and validated before being sent to AI. Existing localStorage layout/colors/history are migrated where component IDs still match. Pending jobs resume across refresh/project switches; completed pending mutations only apply to the matching revision. Storage failures remain visible in the assistant panel. The shared account header and live-DOM PDF capture are unchanged.

Local worker now uses `features.fast_mode=true`, `service_tier=fast`, `model_reasoning_effort=low`, returning small operation plans. It supplies current authoritative cache data to the model and avoids API refreshes for presentation edits/current-period questions. Newly requested periods still use the existing cache-first data preparation. Dataset previews carry rowCount/truncated flags; the model must read complete data for totals/rankings beyond previews. Read-only MCP remains available when the answer needs data absent from current report context. Backend reads are deduplicated and audited in each job's backend-queries.jsonl; model tool reads remain in queries.jsonl. Fast mode may consume more usage (official documentation: https://learn.chatgpt.com/docs/agent-configuration/speed).

Live verification in an isolated localhost origin preserved the user's 127.0.0.1 report: add TikTok trend 4.69s; compound type/order/purple/delete edit 5.85s; Meta spend/ROAS answer 6.88s with no canvas/history change; remove-all 5.48s, then Undo restored all components; empty-report Google campaign question used an actual MCP query and completed in 12.57s. Four consecutive Undo operations reversed manual delete/color/order and an AI compound edit; keyboard Redo, chat Undo/Redo and refresh persistence were verified. 30 Node tests cover editor transactions, all prior data/layout rules, immutable snapshots, stale revisions and conversation validation.

ANC server was queried read-only through the configured EMW3_ANC_AI SSH alias (hostname anc). It has Codex 0.162.1 and the Dashboard Bridge service; its global Codex configuration is maximum reasoning/standard tier. No remote code, settings or services were modified. Local CLI 0.154.0 accepted the Fast configuration. No deployment.

Older implementation notes below are historical and superseded by this section where applicable.

---

# TikTok and presentation update

TikTok now reuses the existing Bluevua daily report's `TIKTOK_REPORT_URL`, token and advertiser configuration through sibling `builder_tiktok.py`. The advertiser metadata permission is no longer a prerequisite for reporting. Its private local reporting context is matched against the daily advertiser ID; USD follows the verified Bluevua Media Budget Plan & Pacing AA currency column (`"$"#,##0.00`). Dates remain the account-local dates returned by the daily reporting API; no exact IANA timezone is invented. This does not change the daily service, credentials or permissions.

Live current/PoP reports each returned seven days. Oct 20–26 spend 327.06 USD, purchase-attributed revenue 681.08 USD (daily-report definition spend × complete_payment_roas), two complete payments. Oct 13–19 spend 350.45 USD. The 2025 range returned an empty successful report and remains unavailable, never zero. Private evidence is cached with reporting-context provenance. Current paid-channel coverage is 6/6.

Canvas and PDF no longer contain instructional/coverage/attribution-note blocks or the Cached data badge. Explanations are placed in the assistant answer. Metric and comparison-table PoP/YoY use the existing EDM Badge component, arrows, green/red/null styles and the (current - prior) / abs(prior) rule. CPA/CPC use inverse favorable direction. Chart-data tables retain chart series colors.

Click a curve, bar or legend to edit that series color in a BoardUI Dropdown with semantic palette, custom hex, and reset. Preferences persist by project/widget/metric in localStorage. Legends use a stable component identity, and floating controls stop events from bubbling into Recharts. Existing theme and account header are unchanged. PDF still captures the live DOM, including saved colors. Verified an actual one-page export with custom #3366CC curve color (3,063 exact-color pixels in its embedded image), no canvas note blocks. Tests: 24 Node + 6 TikTok Python tests, TypeScript and scoped ESLint.

Older notes below describe previous stages; this update supersedes their TikTok and canvas-note limitations.

---

# Dashboard Builder · October 26 update

Current local route: `/ai-tools/dashboard-builder`. All visible tool/home labels now use Dashboard Builder. No deployment; shared account header unchanged.

Default: Bluevua, Time Period (Oct 20, 2026 – Oct 26, 2026), Last Week (Tue–Mon). PoP Oct 13–19; calendar YoY Oct 20–26, 2025. Current date is provisional. Cards expose both comparisons; paid and EDM channel tables include percentage changes. Zero/missing baselines remain null. Aggregate paid spend compares only identical covered channel sets; revenue/orders attribution is never summed across paid platforms.

Data: `.state/ai-dashboard/overview/` contains private raw source files for the three periods. Google Ads and Klaviyo use existing read-only reporting database exports; Meta, Microsoft, Reddit, ChatGPT Ads are account-wide API reports. Store revenue/orders reuse the Dashboard Klaviyo `Placed Order` metric, not Shopify `total_sales`. TikTok is listed but unavailable: existing token cannot read advertiser metadata needed to verify currency/account. Reddit YoY returns no partitions; ChatGPT Ads rejects the 2025 range. Missing data is not zero. Microsoft and ChatGPT caches do not supply conversions/traffic, so those fields remain unavailable.

Local adapters live in sibling slack-ads-report/scripts: `export-dashboard-builder-data.cjs`, `cache-builder-channels.py`. Override `AI_DASHBOARD_REPORT_ROOT` if the sibling repository moves. Before a new query, backend reuses cache, exports missing DB periods, and calls the other paid-platform APIs only for absent/stale data. Failed/current/incomplete cached periods retry after 15 minutes. Historical complete caches persist. Missing Google/Klaviyo partitions are re-read from Dashboard DB; direct Google/Klaviyo API backfills are not implemented (all three requested default periods have seven database dates). September legacy snapshot remains preserved as an offline fixture.

Codex receives only the read-only cache MCP, no marketing credentials. Backend recomputes comparisons, validates fields and materializes chart data. Real local task `0490ecc5-0559-41cc-be79-36737b5b46b8` completed with 11 widgets; default preview has 10. Tests: 22 across data validation, comparison math, missing channels, layout history, theme/options. Export PDF still captures live canvas and drag/delete/undo/redo behavior is retained.

The older implementation notes below describe the initial September-only version and are superseded where they conflict with this update.

---

# Dashboard AI — local snapshot preview

Entry points: `/ai-tools` and `/ai-tools/dashboard-builder`. Homepage AI entry links now point to `/ai-tools`; the external Agent URL has been removed. Canvas is on the left, conversation on the right. Small screens have an Ask AI jump link. Dark/light appearance is scoped to the tool.

## Run locally

```sh
NEXT_DIST_DIR=.next-ai-tools npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open http://127.0.0.1:3100/ai-tools/dashboard-builder. The separate build directory avoids interfering with the normal development server. APIs only execute in development on loopback hosts. This preview adds no production auth bypass or deployed service.

Prerequisites: Node with `--experimental-strip-types`, installed authenticated `codex` CLI on PATH, existing project dependencies. Optional `AI_DASHBOARD_CODEX_BIN` selects the local executable. `AI_DASHBOARD_SNAPSHOT_DIR` overrides the fixed snapshot directory. Default: `.state/ai-dashboard/snapshots/2026-09-snapshot-20261026/`.

## Flow

1. The canvas initially shows a clearly labelled saved snapshot preview, computed locally without an AI call.
2. POST `/api/ai-dashboard/jobs` validates the same origin, question length, owner and known date constraints, creates a durable private job and starts a detached worker. One concurrent job per owner, four globally.
3. `scripts/ai-dashboard-worker.ts` runs `codex exec` with read-only sandbox, no shell/JS execution or web search, ignored user configuration, and one required snapshot MCP server. Existing Codex login supplies model authentication; no platform API credentials are passed to it.
4. `scripts/ai-dashboard-mcp.ts` exposes only `query_snapshot`: allowed sources, groupings and September dates; no SQL, arbitrary file paths, refresh or network clients. Successful reads produce query receipts.
5. Codex returns a JSON report specification via an output schema. The backend validates allowed fields, widget kinds, metrics per source, date bounds, ranking fields, unique IDs, chart units and successful query provenance. All displayed numeric data and ratios are recomputed from the fixed snapshot. The model supplies narrative and field references, never trusted numeric widget values or executable code.
6. GET `/api/ai-dashboard/jobs/:id` checks ownership and returns progress/result. The frontend polls and renders metric cards, daily trends, bar charts and tables. Follow-up tasks receive only the prior validated specification. Session storage remembers the last task ID to recover after refresh; no credentials or data are placed there. Export JSON downloads the validated report with its data.

Jobs, query receipts, Codex event logs and configuration live under ignored `.state/ai-dashboard/jobs/<uuid>/`. Worker timeout: 210 seconds; stale jobs become failed after five minutes. Failures keep the previous report visible and release the owner's queue lock. A Codex failure does not fall back to invented charts or a deterministic answer disguised as AI.

## Test data semantics

Frozen request clock: 2026-10-26 America/Chicago. Last month: September 1–30, 2026. Last 30 days: September 26–October 25, unavailable in the snapshot, so the user receives a range explanation without a marketing API call. Explicit ISO date ranges and September subranges take precedence over broad month names.

Only Google Ads and EDM are available. Google cost micros are divided by 1,000,000; ROAS/CTR/CPC/CPA are computed from aggregate totals. Google conversions may be fractional. Google dates preserve the existing reporting date keys; account timezone metadata is America/Los_Angeles. EDM uses US/Eastern, campaign send-date attribution and flow activity-date attribution. Message-level unique clicks/opens are not deduplicated people. Google and EDM attributed revenue must not be added together. Current dimension names are not reconstructed historical metadata. Full-month Website Tracking is unavailable.

The snapshot backup and extraction receipts are described by its README, manifest and coverage files. This iteration makes no marketing API calls, database writes, remote queue changes or deployment.

## Verification

```sh
node --experimental-strip-types --test lib/ai-dashboard.test.ts
npx tsc --noEmit --incremental false
npx eslint lib/ai-dashboard*.ts scripts/ai-dashboard-*.ts app/ai-tools app/api/ai-dashboard app/page.tsx proxy.ts
```

Real end-to-end runs:

- `c8d757ed-a16d-444f-8d4e-ad994b1e86fa`: natural-language September overview, seven widgets, successful MCP query receipts and validated numeric data.
- `6df817c9-2e9a-4e0c-b425-4f2e79f98add`: follow-up “Add an EDM revenue trend”, preserved seven widgets and added the EDM daily trend. Refresh during execution recovered the running task and completed report.

Browser verification covers desktop, 390px mobile width, dark/light controls, date rejection without replacing the report, JSON download, snapshot preview and the AI result. Independent code review identified an explicit September subrange parsing issue; it was reproduced, fixed, and covered by regression tests. This is a local test tool, not a production-hosted job service.

## PDF, layout and project updates

Export PDF captures the currently rendered Dashboard canvas in the browser using html-to-image and embeds that capture in a canvas-sized PDF page with pdf-lib. It preserves the live grid, positions, visible table rows/expanded state, fonts, theme and chart styles. It does not rebuild charts or metric cards in another template. Floating edit controls are excluded without taking up layout space. The old ReportLab renderer and server export endpoint have been removed. The output is a sharp, image-based long-page PDF; the chat/account UI is outside the exported report region.

All cards, charts and tables share one ordered grid. Subtle upper-right drag grips appear on hover/focus (remain visible for touch). Dragging creates an elevated preview and a faded placeholder; the other components spring into position during the gesture, before release. Pointer tracking survives DOM reordering. Arrow keys also move a focused component. Layout order is saved by project in local storage and used by PDF export. Project switching does not lose an accepted background job.

The large project selector includes Bluevua, Biceek and Ringconn. Only Bluevua has a test snapshot. Other projects show explicit empty states, disable generation/export, and never reuse Bluevua data.

The shared account header markup remains exactly unchanged. There is no tool-specific theme button, added account bar or Auto control. Theme initialization defaults to the device's light/dark appearance, with the user's browser-local hour as fallback (07:00–18:59 light, otherwise dark). Existing manual light/dark choices remain overrides. System changes, focus, cross-tab storage and minute ticks update automatic mode. Theme is initialized before hydration and the original account button continues to control the whole app.

Verification: 12 contract/policy tests, TypeScript and targeted lint; actual pointer dragging across cards and project switching; actual PDF downloads checked with pypdf and all pages visually rendered with PDFium. Generated-report export contains the correct September values and the full EDM trend; table headings remain with their data. No deployment or marketing API refresh.


Hover controls: delete floats over the upper-left card corner; drag floats over the upper-right. Neither reserves inner spacing. Keyboard focus and touch retain access. Deletions are saved by project and can be undone. Export includes exactly the currently visible components. The final PDF was downloaded, rendered and compared side by side with the live report canvas; its single-page size matches the 1297 × 1750 CSS-pixel canvas at the tested desktop width.

## Complete layout undo history

Every delete, keyboard reorder and completed pointer drag creates an immutable before/after layout entry. A live drag may shift neighbors repeatedly, but is committed as one operation. No-op drags do not create entries, including when stale IDs from an older AI report remain in saved order. The Dashboard toolbar shows Undo with the remaining operation count; Ctrl/Cmd+Z also works outside text fields. Repeated Undo restores mixed operations in reverse order. Layout and the whole history are saved separately per project and survive refresh. The global account header remains unchanged.

Verified in the browser: two consecutive deletes followed by two Undos; a drag followed by a delete, refresh, then two Undos restoring both the widget and original order. Pure tests cover immutability and serialization. There are 16 passing local feature tests.

Redo now complements Undo. `Ctrl/Cmd+Shift+Z` (outside text editing fields) replays the most recently undone delete or layout move; `Ctrl/Cmd+Z` continues to undo. Undo transfers immutable entries to a separate per-project redo stack, and Redo restores their `after` layout. Both stacks survive refresh and project switches. A genuine new delete/move clears the redo branch; a no-op drag does not. Toolbar controls display the available counts. Tests cover mixed delete/drag replay, branch invalidation, immutability and serialized redo state; 19 feature tests pass.

Only `/ai-tools/dashboard-builder` is available. The old route is removed, with no redirect. Saved reports and layout history remain in their existing local storage keys.
