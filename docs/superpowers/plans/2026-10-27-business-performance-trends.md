# Business Performance daily trends

**Goal:** User-approved local update: all eight Overview metrics become daily line charts, with fixed period totals, daily tooltips and legend highlighting.

**Architecture:** Server-side daily adapters reuse the Google snapshots and current Meta, Reddit and Klaviyo reporting clients. A pure aggregation module builds nullable channel series. An isolated client chart uses installed Recharts and BoardUI buttons; BusinessPerformance keeps its existing headline calculations.

**Constraints:** Preserve existing work. Local only. Semantic tokens and composite typography. No synthetic daily values, no summing daily unique reach into period totals. Daily asset series count entities with delivery, distinct from period inventory. Missing rates remain gaps. Maintain Google PMax reconciled testing scope and Reddit configured ad scope.

- [x] Add tests for daily weighted rates, nulls, complete date axis, active assets and daily reach; run red then green.
- [x] Add bounded daily adapters, fail independently by channel, and stream charts without delaying headline totals.
- [x] Replace the eight gauges with responsive line cards and fixed totals; retain breakdown totals and ratio details.
- [x] Verify TypeScript, targeted lint/tests, desktop/mobile rendering and tooltip/legend behavior; open local preview.

Verification: 17 targeted tests passed; TypeScript and targeted ESLint passed. Browser checks at 1440×1000 and 390×844: eight charts, correct responsive columns, no horizontal overflow. Revenue tooltip showed Oct 22 Google $8.52 / Meta $2,169.76; total remained $4,402. Meta legend click set aria-pressed=true and dimmed other lines to 0.16 opacity. Keyboard ArrowRight displayed Oct 21 values. Final browser console had no errors or warnings. Local only; no deployment.
