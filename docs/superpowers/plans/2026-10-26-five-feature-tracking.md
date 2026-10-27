> Superseded by the user-approved page-based plan in `2026-10-26-page-tracking-dashboard.md`. Existing feature coverage is retained within page and cart sections.

# Five-feature tracking completeness implementation plan

**Goal:** Audit all five feature contracts and show their data before general reporting.
**Architecture:** One typed inventory maps 50 checks (37 behavior/attribution nodes, 11 GA4 event names) to exact event/source/action/result tuples or item-list/coupon reports. Existing sequential read-only queries and private background snapshots are retained. Exact grouped user counts are never summed across overlapping rows. All five feature sections show inventory rows, including zero/unavailable states; auxiliary reports follow.
**User scope:** Audit and implement all five features, move other content below; preserve design, date/device filters, 30-day defaults, silent updates; AI and benchmarks remain paused.

- [ ] Record definitions and evidence-backed counts; distinguish current implementation from obsolete Compare drawer documentation.
- [ ] Test inventory uniqueness/counts, source and result matching, non-additive users, missing reports versus zero activity, quantity/revenue attribution and coupon separation.
- [ ] Add source-level event, operation outcome, item-source and coupon queries; validate real GA4 compatibility and coverage. Include all source fields in cache validation/versioning.
- [ ] Build five source sections with shared cards/tables and move overall/events/device/raw reports below. Retain Collection rate within Compare.
- [ ] Validate live reports, type/lint/tests, actual browser behavior and responsive layout. Review entire change and record limits.

**Counting rule:** A behavior/attribution node is a distinct trigger or source-linked ecommerce stage. A check splits operation-result nodes into supported states: product add/upgrade success/error/unverified (three); promo apply success/not_applicable/error/unverified (four); promo remove success/error/unverified (three). Four product sources each have seven base nodes; Compare has three additional entry/page nodes; Promo has six. Counts: 7+7+7+10+6=37 nodes and 9+9+9+12+11=50 checks. Cart view and checkout click are shared funnel context, excluded from the five-feature count.

**Limits:** Read-only source inspection, no storefront modifications or synthetic analytics events. No assumption of complete paid-order attribution when GA4 returns no purchases. Legacy selected-model Compare drawer is documented historically but absent from the current inspected implementation; report actual entry-point values separately. No new AI, unrelated jobs or credential transfers.

**Hierarchy ruling:** Actual storefront routes and GA4 page paths show Collection pages, an independent Compare page, PDPs, and a site-wide cart drawer. Use four contexts; allocate the 50 checks as Collection 2, Compare page 10, PDP 9, Cart drawer 29. Cart queries stay source-scoped across host pages; do not filter them to `/cart`.
