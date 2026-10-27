# Testing Ask AI → AI Design

User-authorized backend-only integration. Keep the existing website request and Answer schema.

1. Add Bridge-only structured routing for authenticated `bluevua-testing-chat` questions: Bluevua returns its answer plus an optional design brief. Analysis/translation/EDM routes remain unchanged. No Slack sender/channel context is fabricated.
2. Execute a requested brief in the fixed Design project using the existing native SDK/capacity slot. Preserve the Bluevua thread mapping; Design identity is recorded separately. Pass the latest user request, scoped frozen Dashboard data and attachments; design must use existing Design rules and return readable Markdown/verified delivery links.
3. Journal Design handoffs privately by owner and request ID. Completed results are reusable; interrupted/uncertain executions fail closed rather than re-create a design job. Existing stop requests interrupt whichever native turn is active.
4. Validate with mocked native routing, ownership/idempotency, cancellation/failure and unchanged non-Testing contracts. Add one real isolated read-only native handoff probe; do not generate shared reports or publish design assets for QA.
5. Save runtime source, tests and a narrow patch in this repository. Back up live Bridge files, wait for an idle Dashboard queue, deploy only those files and restart only Dashboard Bridge. Push with skip-ci; no website build/restart, shared Slack/runtime restart or stored-analysis regeneration.
