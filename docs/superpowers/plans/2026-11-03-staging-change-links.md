# Staging change links implementation plan

Goal: Reviewers can select a release change, navigate to its page, scroll to and highlight the actual changed area.

Design: Extend the manually maintained pending-release record with known change IDs. A small typed catalog maps IDs to bilingual copy, trusted local page paths and stable data attributes. The global staging review UI lists links and, on a review hash, waits for streamed content, optionally opens the known analysis expander, then outlines the real target and shows a dismissible description. Missing content reports unavailable instead of highlighting a substitute. Same-version releases hide change links. Existing reviewer access and manual-only deployment remain unchanged. Unrelated workspace edits are excluded from this work.

Approach: Use explicit semantic targets, which remain stable across layout changes. Avoid inferred visual diffs and arbitrary CSS selectors from release metadata because these cannot reliably identify intended changes.

- [x] Add validation/catalog tests; observe failure, implement pending-only change records and CLI validation.
- [x] Add semantic anchors, linked release list, navigation, timed highlight and unavailable/dismiss states.
- [x] Verify unit tests, TypeScript/lint, local browser desktop/mobile navigation and late/missing/hidden targets. Browser plugin not available; use isolated Playwright.
- [ ] Review final diff, commit only this feature, manually build/deploy staging and verify live links/highlighting. Preserve unrelated edits and production.

Verification: 15 staging tests passed; TypeScript and targeted ESLint clean. Isolated browser QA passed repeated same-page selection, scrolling, dismissal, mobile overflow, delayed targets, missing-target failure and hidden analysis expansion. Real report browser QA passed overview target, cross-page navigation to a named creative, social table target and 390px mobile layout. Read-only review found no remaining blocker. Unrelated dashboard-builder/history edits remain excluded.
