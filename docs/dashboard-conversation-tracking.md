# Dashboard conversation tracking

Updated: 2026-10-28.

Remote project root: `/home/ubuntu/work/bintian/emw3-dashboard`.
Native project ID: `01a182a5-3b0c-73c0-b5f6-863bcade30d9`.
Desktop project ID: `228163be-bf82-41e8-89a4-90c858206c3d`.
These are different identities; use the appropriate API.

Do not create sidebar sections. Preserve website conversation titles beginning with `Bluevua · Dashboard Ask AI · <user>`; other platforms can keep their brand prefix. Slack discussions use `Dashboard · slack · <original requester> · <topic>`. Use the first verified Bridge Slack context, not a later participant or a guessed profile. Do not restart shared Codex for filing.

`ops/dashboard-thread-project.py` and `ops/bridge-dashboard-thread-project.patch` assign newly created persistent Dashboard conversations to the native Dashboard project. They do not change titles, execution directories, prompts, permissions, model selection, conversation IDs, or ephemeral translation lifetime. The SDK integration applies only to Dashboard thread creation; Slack execution is unchanged.

Remote migration audit is in Bridge `.state/dashboard-project-migration-20261028.json`. 23 related histories were assigned to the native Dashboard project; archived status was preserved. Existing Ask AI histories were assigned to the project and their stored cwd updated using native APIs. The discarded sidebar section was deleted. Do not edit Codex SQLite or rollout histories directly.

The native metadata service subsequently reported connection-pool timeouts. Verify persisted project/cwd for Ask AI histories with read-only queries and UI when the connection is responsive; do not claim further metadata writes succeeded merely because a request was submitted. The user explicitly declined further historic renaming and shared Codex restart.

## Slack automatic tracking (enabled 2026-10-28)

10 visible Slack histories are named and filed under the Dashboard directory. Their original requester/topic mappings are stored privately in Bridge `.state/dashboard-slack-filing/`. One archived historical entry has no available rollout; it was left archived rather than reconstructed.

Source module: `ops/slack-dashboard-tracking.py`, installed as `anc_bridge/slack_dashboard_tracking.py`. Integration: `ops/bridge-slack-dashboard-tracking.patch`; tests: `ops/test_slack_dashboard_tracking.py`.

The trusted first-turn Slack profile supplies the original requester. Explicit Dashboard references (or an existing filing marker) identify matching conversations. A new matching native thread receives the Dashboard project identity without changing its brand/Design execution cwd or instructions. After confirmed completion, idle conversations receive the naming convention and stored Dashboard directory. Curated subjects are preserved. Generic follow-ups retain the original requester and filing scope. Unrelated Slack work and website Ask AI are unchanged.

Filing uses native metadata methods, never direct Codex SQLite writes, model calls, performance APIs, or outbound Slack messages. Metadata errors do not change the completed AI result; the private marker preserves scope for a later continuation. Test coverage includes active-turn exclusion and metadata failure isolation.

Validation: 49 targeted and existing execution/worker/startup regressions passed. Published through the Bridge release/drain protocol after ready, preserving unrelated production changes. Slack Bridge returned to serving; Dashboard Bridge stayed active. No website build or shared Codex restart.
