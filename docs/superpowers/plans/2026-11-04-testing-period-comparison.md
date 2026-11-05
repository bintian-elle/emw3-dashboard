# Local staging Testing period comparison

User requested the EDM-style pair of reporting/comparison selectors, swap action and metric PoP, without changes to the ongoing PMax insight presentation. Implement as a shared local-staging provider and read-only authenticated comparison endpoint; production/built staging remain unchanged until explicitly authorized.

- Default to the previous inclusive equal-length period. Also support previous year, normal Testing presets and independent custom ranges. Swap actual ranges and match preset labels again.
- Use existing raw Google published history and the same testing report functions. Read exact published Meta/Reddit/EDM periods, regardless of preset alias; never substitute another period or fetch advertising APIs. Shared cache and local seed data remain read-only.
- Add PoP to Overview headline/channel tables, Search groups/ads, PMax groups/assets, Demand Gen rows, Meta groups/ads, EDM variations and Reddit groups/format/ad rows. Keep current-period sorting. Use EDM shared Select, Button and Badge primitives with the same arrow/absolute-percent PoP text and inverse cost metric coloring. Missing data and zero comparison denominator display unavailable, not infinite growth.
- Fetch comparison independently; abort obsolete requests, retain primary display, expose loading/error and preserve comparison parameters through navigation. Fixed lifetime views remain unchanged.
- Verify date arithmetic, swaps, leap dates, missing/zero baselines; TypeScript, targeted lint and authenticated local browser flow. No Git push, deployment, prompt changes or AI regeneration.
