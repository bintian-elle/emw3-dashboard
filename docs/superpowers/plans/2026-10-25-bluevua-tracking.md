# Bluevua Tracking Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a source-backed website tracking dashboard alongside existing Bluevua dashboards.
**Architecture:** Server component loads independent GA4 reports; client BoardUI filters update URL search parameters. The existing server anc-ga4 CLI supplies fixed-account reports; partial errors remain visible.
**Tech Stack:** Next.js 16, React 19, BoardUI, GA4 Data API.
**Spec:** docs/superpowers/specs/2026-10-25-bluevua-tracking-design.md

## Global Constraints
Semantic color and composite typography utilities only. Reuse existing components. Never fabricate metrics. No production deployment requested.

## Review Focus
Invalid dates, incomplete authentication, missing custom dimensions, empty report rows, and incompatible event/item metrics must have explicit handling.

### Task 1: Reporting contract and GA4 reader
Files: lib/website-tracking.ts, lib/website-tracking.test.ts, lib/website-tracking-api.ts.
- [x] Test calendar validation, device allowlist, zero denominator, and report request hostname filtering.
- [x] Implement pure reporting contract, shared CLI adapter, full-export parsing and independent reports.
- [x] Run node --experimental-strip-types --test lib/website-tracking.test.ts.

### Task 2: Dashboard and navigation
Files: app/bluevua/tracking/page.tsx, tracking-filters.tsx, loading.tsx, app/bluevua/page.tsx, docs/website-tracking.md.
- [x] Reuse DateRangePicker, Select, Button, Card, StatCards and project branding.
- [x] Show event overview, action results, item-list attribution and metadata/errors.
- [x] Verify TypeScript, targeted lint, unit tests and production build.

Execution: user authorized direct implementation in this chat. Existing checkout retained; feature branch codex/bluevua-website-tracking. Data connection revised after discovering the existing AI Bluevua tool; no credentials copied. Validation and independent review are recorded in docs/website-tracking.md.
