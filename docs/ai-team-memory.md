# Remote team analysis memory

Implementation is prepared; production enablement is a separate deployment step.
Memory lives in the remote Dashboard Bridge, not in the analytics database.

## Chat commands

- `记住：先确认是否为计划内 Flow 切换，再建议优化内容。`
- `Remember: Check planned flow transitions before optimizing content.`
- After reviewing the generated draft, send its exact `确认保存 <ID>` or
  `/memory confirm <ID>` command.
- `查看团队记忆` / `/memory` lists active preferences.
- `停用规则 <ID>` / `/memory disable <ID>` disables a rule.
- To revise, disable the old rule, then propose and confirm the replacement.

Drafts are not active until confirmed. Confirmation expires after 24 hours.
Long-term analytical rules and period-specific user-reported context are distinct.
All authorized site users share the Bluevua EDM team scope; there is no personal identity.
New analyses read confirmed preferences. Existing insight caches remain unchanged.

## Deployment order

1. Publish and verify the remote Bridge memory extension first. Development worktree:
   `/tmp/anc-dashboard-team-memory` on `EMW3_ANC_AI`.
2. Deploy this Dashboard client change.
3. Set server-only `CODEX_BRIDGE_TEAM_MEMORY_ENABLED=true` and reload its environment.

The flag defaults off so existing Bridge instances continue accepting requests.
Do not use a NEXT_PUBLIC variable. When enabled, the server sends the exact current
user question as `latest_user_message`, separate from the history-wrapped prompt.
Neither attachments nor earlier conversation text can authorize a memory change.
Both streaming and non-streaming Ask AI paths use this protocol.

No Supabase schema change is needed. The Bridge persists proposals, confirmations,
disabling events, and per-job memory snapshots in its private state directory.
Codex shell, native/global memory and arbitrary file/database writes stay disabled.
Only explicit confirmed preference operations write to the remote memory store.

## Verification

- Remote full mocked suite: 369 passed; compileall and diff checks passed.
- Dashboard: TypeScript and diff checks passed.
- Covered: draft/confirmation, duplicate confirmations, restart persistence,
  period isolation, disabling, expiry, prompt isolation from history/attachments,
  old request fingerprints, and existing Slack/native permission regressions.
- Not yet performed: production deployment, real-model draft quality, browser
  end-to-end acceptance. No production preferences or cached insights were changed.
- Remote branch: codex/dashboard-team-memory, based on 8616539 plus the existing
  uncommitted attachment changes preserved from production. No commits or push
  were made for this feature; do not replace production with a clean old HEAD.
