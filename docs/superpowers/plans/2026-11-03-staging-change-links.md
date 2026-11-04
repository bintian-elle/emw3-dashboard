# Staging change links implementation plan

Goal: Reviewers can select a release change, navigate to its page, scroll to and highlight the actual changed area.

Design: Extend the manually maintained pending-release record with known change IDs. A small typed catalog maps IDs to bilingual copy, trusted local page paths and stable data attributes. The global staging review UI lists links and, on a review hash, waits for streamed content, optionally opens the known analysis expander, then outlines the real target and shows a dismissible description. Missing content reports unavailable instead of highlighting a substitute. Same-version releases hide change links. Existing reviewer access and manual-only deployment remain unchanged. Unrelated workspace edits are excluded from this work.

Approach: Use explicit semantic targets, which remain stable across layout changes. Avoid inferred visual diffs and arbitrary CSS selectors from release metadata because these cannot reliably identify intended changes.

- [x] Add validation/catalog tests; observe failure, implement pending-only change records and CLI validation.
- [x] Add semantic anchors, linked release list, navigation, timed highlight and unavailable/dismiss states.
- [x] Verify unit tests, TypeScript/lint, local browser desktop/mobile navigation and late/missing/hidden targets. Browser plugin not available; use isolated Playwright.
- [ ] Review final diff, commit only this feature, manually build/deploy staging and verify live links/highlighting. Preserve unrelated edits and production.

Verification: 15 staging tests passed; TypeScript and targeted ESLint clean. Isolated browser QA passed repeated same-page selection, scrolling, dismissal, mobile overflow, delayed targets, missing-target failure and hidden analysis expansion. Real report browser QA passed overview target, cross-page navigation to a named creative, social table target and 390px mobile layout. Read-only review found no remaining blocker. Unrelated dashboard-builder/history edits remain excluded.

## User follow-up: screenshot notes and reading status

User additionally requested region screenshots instead of text-only location markers, Unread/Read labels with distinct colors, and deletion by the creator or Bintian only. Extend this same staging release. Capture the current viewport locally, let the reviewer drag a region, preview it and attach text; upload only on Save. Persist a bounded, server-normalized WebP beside each private note, return only image metadata in polling and serve images through an authenticated staging-only endpoint. Retain the existing anchor point as a navigation aid. Reuse the resolved field internally for shared read status. Enforce creator/admin deletion on the server, archive deleted records privately, and remove them/images from normal access. Preserve other work in the workspace.

- [x] Test image validation/persistence and deletion permissions before implementation.
- [x] Implement private image storage/API, screenshot selection/preview, read colors and deletion UI.
- [ ] Verify real screenshot fidelity, persistence/sharing, cancellation, mobile selection, read toggles and creator/admin permissions; manually build and deploy final combined release.


Final local verification: 18 staging tests passed, including concurrent status/delete regression. Screenshot QA passed capture/preview/save/shared image access/read colors/creator and admin deletion/outsider rejection/mobile layout. Global note QA passed all-page listing, page labels, no foreign-page pins, cross-page anchor highlighting and non-anchored page notes. Panel hierarchy QA confirmed update links are inside the update section and team notes is its lower sibling. TypeScript and targeted ESLint passed. Archived JSON is an authoritative deletion tombstone; listing and image routes suppress raced replacements. User authorized manual staging deployment and direct independent production deployment of AI tool changes; AI tool changes are omitted from the staging release summary/catalog.
