# Daily report publication and recovery

The 05:20 America/New_York task first attempts every due English period independently, publishing each completed period immediately. Last Week still generates only on Tuesday or when its exact report is missing. Daily Reddit/Social lifetime results are reused across the period runs.

After the English periods, discover concluded-test reports independently, then translate saved results. Translation failure never blocks later English periods. All stage errors are collected in `.state/content-testing-daily/YYYY-MM-DD/completion.json` and reported to the existing failure notifier after other stages finish.

Recovery: run `scripts/content-testing/daily.mjs` with the same production environment and bridge Python path. The existing database advisory lock prevents concurrent runs. It reuses the frozen daily snapshot and existing result files, verifies whether each payload is already published, and preserves corresponding Chinese translations if unchanged. Do not delete result files, reset queued jobs, or remove old analysis to retry.

Translations reuse completed chunks. Standard English month abbreviations are validated as equivalent Chinese calendar months; changed metrics or URLs still fail validation. An invalid/failed chunk can retry twice using persistent `:retry:1` and `:retry:2` job IDs, preserving successful chunks and deduplicating polling. Exhausted retries remain explicit failures rather than publishing unverified text.

Changing the translation contract or refresh API requires rebuilding the web service. Prompt and standalone daily-controller changes only require syncing the files. Keep local, GitHub and production files aligned.
