# Page-based Website Tracking implementation plan

**Approved scope:** User approved page type → concrete URL → existing behavior counts and visitor percentages. Cover all 27 existing normal GA4 definitions and raw unknown events, all five feature sources, cart drawer and checkout context. Default 30 complete days; AI stays paused. No changes to other pages or shared component defaults.

**Architecture:** Keep the existing general tracking snapshots. Add independently cached page-scoped reports (events, exact source/action/result tuples, daily trend and public URL choices). Use a generic private snapshot store with the same atomic writes/kernel lease and last-good retention. Page changes query only the page scope, never recompute every global report. Reuse BoardUI Select, DateRangePicker, StatCards, Table, Card and sidebar primitives. Keep the percentage-capable chart local to tracking.

- [x] Isolate existing preview chart changes from shared UI; preserve every unrelated file.
- [x] Define the 27-event manifest and page scopes; test page/URL validation, date/device preservation, deduplicated visitor ratios, missing versus zero and exact operation matching.
- [x] Reuse snapshot storage for independently cached scoped queries; test scope isolation, concurrent refresh and last-good retention.
- [x] Add page and URL filters, page-first cards, all directly visible percentage tables, contextual feature sections and support reports below.
- [x] Validate real source reports and browser interactions (dates/device/page/URL), desktop/mobile/dark styling, full tests/type/lint and a production build. Review isolation and remaining limits.

**Metric rules:** Page denominator is the ungrouped page_view user count in the selected scope; cart denominator is view_cart users. Numerators use the same date/device/host/page filter. Never sum distinct users across URLs, dates, actions or result states. Unsupported or zero-denominator ratios display an em dash. Daily rates use daily denominators. All visible event counts are records, not guaranteed successful operations; result states remain separate. Item-source quantities/revenue never become user counts. No cache explanations or sample business data in the product.

**Privacy:** Concrete URL choices only expose public browsing paths; account/order/checkout identifiers are never placed in dropdowns, URLs or cache payloads. Source-system writes, credential copies, new instrumentation, AI and unrelated jobs are out of scope.
