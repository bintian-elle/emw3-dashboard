# Staging Prompts Implementation Plan

**Goal:** Add the approved Prompts workspace page, versioned edits and attributable, isolated Search/Readability insight trials to remote staging.

**Architecture:** Source-owned catalog describes every Content Testing prompt and its consumers. New isolated database tables persist immutable versions, per-account change notes/diffs, staging selections and jobs/results; the report database connection remains read-only. A dedicated low-priority worker resumes the existing Bluevua Content Testing Insights conversation serially, using frozen Dashboard data and captured prompt versions. It never publishes production reports or edits production prompt files. Stage-only authenticated, same-origin endpoints expose the workflow.

**Tech Stack:** Next.js route handlers, existing Nova components, PostgreSQL, existing Python anc_bridge SDK and staging manual deployment.

## Tasks
- [ ] Catalog + immutable version persistence; optimistic conflicts, rollbacks as new versions, server-owned author identity, transactional writes and bounded diffs.
- [ ] Staging-only Prompts editor, history/diff, saved scope/date selection, queued run status and report preview. Search/Readability trials first; all prompts visible/editable. Unsaved edit protection.
- [ ] Frozen Search inputs from published Dashboard snapshots, exact identity/date checks and recorded input hash. Readability-only reuses a completed baseline.
- [ ] Dedicated staging job worker with single existing thread, serial turns, recovery and strict result validation; all output stays in new tables. Show honest waiting/running/completed/failed states.
- [ ] Tests, type/lint, local browser review; isolated source commit and remote staging publication only, health/auth checks and real trial. Preserve all unrelated local-only PMax/PoP changes.

## Rulings
- First rollout exposes staging versions and a staging-selected version, never a misleading production activation button. Production activation needs later explicit publication/integration; UI states the daily task is unchanged.
- Use a narrowly privileged new database role for new staging tables. Existing staging report reader permissions remain unchanged.
- Source prompts remain the deployed baseline; staging edits persist across deployments. An already saved production report without captured prompt versions is labeled unrecorded rather than inferred.
- Trial generation is asynchronous, not browser-bound, and does not promise realtime model-token streaming. A result records immutable version IDs, exact scope, frozen packet and native turn ID.
