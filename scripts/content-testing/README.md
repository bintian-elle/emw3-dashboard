# Isolated Content Testing preview

This workflow generates Chinese channel reports first and Overview last, in the existing `Bluevua · Content Testing Insights` native conversation. It bypasses the production AI queue/cache and writes only isolated files. It does not change the online scheduler or prompts.

## Prompt ownership

- `prompts/content-testing/master.md`: ordering, allowed background/web research, evidence boundaries, flexible page contract, conclusion-first prose and inline verified links.
- The seven channel files: their own analytical content, tables and detail chapters. Do not impose a universal chapter template.
- `overview.md`: synthesize completed same-run channels and authoritative frozen totals. Never run first.
- `prompts/ask-ai/testing.md`: the Testing chat's conclusion-first and inline source-link rules. This file is read at request time; the current change is local only.

One summary per report. Detailed sections do not repeat Executive Summary. Do not display source/limitation panels, cache timestamps, local paths or internal job IDs. Public web evidence and original Drive/Slack links belong beside the supported claim. Keep technical audit fields privately in JSON.

## Current preview

Private local folder: `.state/content-testing-preview/20261028-zh/` (ignored by Git).
Dates: Last Week Oct 20–26, 2026; Reddit same-period plus lifetime; Social lifetime.
Sources: the newest saved Dashboard frozen input for each requested scope, exported read-only from existing jobs. The weekly snapshot was captured October 27; lifetime inputs October 28. This is a frozen preview, not an assertion of a fresh performance API pull. Scope and source capture metadata remain in input/audit files.

1. Export the required existing `ai_job_queue.body.analysis_payload` read-only, without using the saved AI answer. `source-jobs.json` is private input, not a publishing job.
2. `prepare-preview.py` builds one input per channel with scope, dates, allowed identities, matching creative/daily data, prompt hashes and expected channel-specific headings. Its current fixture dates/path are explicit; use a new run folder and confirmed source dates for the next preview.
3. Copy packets and prompt snapshots to a private remote staging folder. The sample uses `/tmp/dashboard-content-preview-20261028/`, not the live prompts folder.
4. Run `run-preview.py --root <staging-folder>` with the existing Bridge venv/PYTHONPATH. It checks the target name/ID and idle state; never starts a new native conversation. Turn IDs and results are persisted. Resume incomplete recorded turns by reading their native result, not by repeating inference.
5. `pull-preview.py` copies completed JSON/Markdown files locally. `polish-preview.mjs` removes duplicated summaries and standalone technical preambles without another model call, retaining originals under `results/audit-original/`.
6. Local `.state/content-testing-preview/active.json` selects a run. Development-only `/api/testing/preview` reads these files, and the local readout route returns preview results before any shared-cache publication or translation. Concluded cache reads remain read-only.

The old Insights conversation was used before the user corrected the target mid-run. Search, PMax and the already-running Demand Gen completed there; subsequent reports use Content Testing Insights. Their exact per-turn thread IDs remain in `state.json`. This exception applies only to this run; future runs default to Content Testing Insights.

## Local UI

The channel panel uses the channel's own sections/Markdown tables. Campaign cards retain data tables and get their own short summary and targeted detail. Overview is only available after all eight channel/window reports (seven channels plus Reddit lifetime) are complete. Lifetime results never overwrite the weekly record. Production ignores this file-backed preview entirely.

Preview reads never enqueue, regenerate, translate or publish a result. Remove `active.json` to restore the normal local cache reader. No deployment or production cache cleanup is part of this workflow.

## Business-only presentation

All current preview reports were reviewed together, including weekly and lifetime Reddit. Remove file/media reading logs, input/schema validation, capture/freeze/cache discussions, execution confirmations and internal task identifiers from summaries, details and footers. Keep concrete performance evidence, content observations, supported actions and brief limitations that change a decision. Preserve verified inline source links and raw model responses privately. `testing-prompt-presentation.ts` provides a defensive display filter; the channel, Overview, master and Testing Ask AI prompts explicitly require business-only prose. Current one-off wording edits live with the private preview run and do not publish to shared caches.

## Compact executive trial

The October 28 compact Search trial uses the same Oct 20–26 input and the existing Content Testing Insights conversation. The first compact attempt was explicitly interrupted at the user's request before adding the executive language rules. The resubmitted v2 prompt has exactly three visible blocks: core conclusion (`executive_summary`), key comparisons and next actions (two `sections`). It targets about half the prior visible length; display rounding must never alter calculation precision or turn fractional purchases below one into zero. `run-preview.py --report google-search` runs only the requested channel and does not regenerate Overview. Save the trial in its own staging folder, validate it, preserve the earlier local Search result, then replace only that report in the active preview. No production publication is part of the trial.

## Latest full-channel regeneration

The `20261028-latest-channels-zh` run preserves the accepted separated Search result (matching prompt hash) and regenerates PMax, Demand Gen, Meta, Reddit weekly, Reddit lifetime, EDM and Social lifetime serially, then Overview. Each channel uses its current numbered prompt; micro diagnosis is routed exclusively to exact Campaign insight records. EDM module analysis and Social post diagnosis use their existing corresponding insight identities. Macro `sections` remain channel-specific. Tables share the inline renderer with controls disabled, no card frame and at most six generated columns.

`pull-preview.py --local-root <folder> --remote-root /tmp/<staging-name>` synchronizes an isolated run. It never switches the active preview or publishes shared results. Keep the previous active pointer until all results and Campaign/entity coverage have been reviewed. Overview reads completed same-run reports only; numbered output heading tests prevent input subheadings being treated as report chapters.
