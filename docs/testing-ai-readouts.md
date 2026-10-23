# Content Testing AI readouts

Static `framework:v1` and exact-period results live in the same shared Supabase database as Insights (`KLAVIYO_DATABASE_URL`). Local and production read the same records. Deploying code does not generate another answer.

## Static framework

Generate the framework before launching a new campaign or changing testing scope. Use the full-document prompt with exact campaign/test identities and `regenerate_framework=true` in a native testing batch. The first reporting period and Social lifetime record carry explicit `[FRAMEWORK]` evidence. The publisher validates and saves this generated content in `testing_ai_readout_cache`, key `framework:v1`, type `framework`. Channel frameworks are reusable; optional `test_frameworks` overrides a matching test_id/campaign_name. Generated business output is private, not a version-controlled prompt. No hand-written analytical fallback is rendered while loading.

## Daily readouts

`POST /api/testing/readouts/refresh` accepts the configured CRON_SECRET (or AI_WORKER_SECRET when CRON_SECRET is unset). It takes one frozen snapshot for Last Week (Tue–Mon), Week-to-date and Month-to-date using the same loaders/scopes/date resolver as the pages. Meta/Reddit requests and Google cached inventory are reused by their existing caches. Period failures are recorded as missing sources, never zero performance. Social is a separate daily lifetime record with its actual capturedAt and stale status.

One persistent queue job per America/Chicago calendar day uses the dedicated Bridge `testing_readout` mode and a separate persistent `Bluevua · Content Testing Insights` conversation. It has priority -10, below interactive questions. The native structured-output schema returns a `period_readout_batch` containing one JSON object per period. Each result must pass date, identity, coverage, numeric type and delta arithmetic validation before publication. Valid periods are saved independently if another period is invalid. The Bridge was updated on 2026-10-20 with the dedicated request/result contract and a separate persistent conversation. Its 103 dashboard regressions passed; only the Dashboard Bridge process was switched, with consistent SQLite backups and unchanged Slack/shared Codex PIDs. The initial attempt through the ordinary Insights envelope was rejected by the local cache validator and preserved for audit; the dedicated v2 run reuses the same frozen data snapshot.

Testing queue rows have `finalized=true` because their publication is managed by the testing refresh controller, not the deployed worker's EDM finalization. `testing_cache_published_at` on the completed queue result is the durable publication marker. Refresh polling and authenticated cache reads publish any completed unmarked testing results using database operations only. Publication uses the job completion time so an older result cannot overwrite a newer readout for the same period. Existing completed/running jobs are reused; a terminal error requires diagnosis rather than silent duplicate generation.

`GET /api/testing/readouts?key=...` only reads the shared cache and publishes completed queue results. It never requests a new analysis or fetches ad data. The client deduplicates concurrent cache requests, polls missing results every 30 seconds for up to 90 minutes, and cancels on navigation. The initial server render contains the existing metric tables with no non-AI goals/summaries. The first successful cache fetch inserts only generated copy; missing period results are omitted while static AI framework remains visible. Cache state is keyed by exact dates and identity, so changing dates cannot show a previous period's answer.

Run today's job against the local app:

```sh
node scripts/refresh-testing-readouts.mjs
```

For production, deploy the local code first, then install and enable `ops/emw3-testing-readouts.service` and `.timer`. The new timer is **09:15 UTC daily** (04:15 Chicago during daylight saving time, 03:15 during standard time). It does not change the existing EDM 07:45 UTC timer. The script polls until results are published and exits nonzero on failure. The timer is not installed by creating these files locally.

```sh
sudo install -m 644 ops/emw3-testing-readouts.service /etc/systemd/system/
sudo install -m 644 ops/emw3-testing-readouts.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now emw3-testing-readouts.timer
```

Custom date ranges reuse static framework only unless an exact supported-period cache exists. A daily Last Week refresh can incorporate attribution backfill; past date-range records remain saved.

## Full-document, ad-first generation (v3)

The complete eight-tab source is versioned in `prompts/insights/content-testing-source.md`, alongside a 60-group coverage checklist. The prompt supplies both, not a shortened replacement. Every required group must have a substantive answer or an explicit evidence gap. PMax summaries are validated at 50–70 English words; every test requires an optimization recommendation. Missing inputs are not fabricated to claim coverage.

Meta and Reddit analysis starts with individual selected-period ad performance and only then rolls up supported format/messaging findings. Meta daily history includes historical ads, not only the currently active subset; ratios are recomputed from sums. Delivery maturity comes from positive observed daily activity where available. Period reach is never constructed by adding ad/day reach. EDM input retains module creative source links and the module click numerator separately from whole-email metrics.

The 2026-10-20 v3 run replaces old Testing cache content after a private backup. A full refresh includes generated fixed frameworks in the first-period evidence, validated and saved separately as `framework:v1`. The client displays all analytical sections and evidence on channel pages and only executive synthesis in Overview. Detail pages receive the same campaign identity and exact selected period as their parent. Website changes remain local until separately authorized for deployment. The AI cache itself is shared as previously requested.

Per-turn prompt reliability: the complete source and runtime instructions are also carried inside `analysis_payload.generation_instructions`. A resumed native chat must receive the current prompt on each turn rather than relying only on thread creation instructions. Account currencies are verified via primary account APIs and cached for 24 hours across periods. When all are USD, the requested blended ROAS is the sum of reported paid conversion value divided by total paid spend; attribution overlap limits interpretation, not that calculation. Total Reach follows the approved additive channel definition, with EDM Delivered and no cross-platform deduplication.

The Overview AI scope must match the existing cards: configured Google testing rows, Meta campaign totals and configured Reddit ad rows. The entire Reddit campaigns remain testing, but their extra ad outcomes are channel context, not the selected page's financial totals. `overview_display_totals` supplies the exact deterministic reference. The current v3 result retains all native-generated test objects; its Overview factual amounts were rebound to this card scope without changing the native judgments, actions, deltas or frameworks. Original output and reconciliation provenance are retained. Snapshot times remain stored for audit rather than displayed in the UI.

Local final UI verification observed later source backfill: Last Week's live card was USD 1,392.38 conversion value / USD 2,153.25 spend (ROAS 0.65), versus the frozen analysis snapshot's USD 1,392.38 / USD 2,147.88 (ROAS 0.648). This is a capture-time difference after the scope correction; snapshot times remain stored for audit and the daily analysis is not silently recomputed on every visit.

## Account language and Chinese translations

The account header has an EN / 中文 control immediately before the signed-in name. New accounts default to English. The authenticated PATCH `/api/account/preferences` stores the Google subject's selection in `public.site_user_preferences` in the same database as `ai_insight_cache`. The server seeds the language provider on refresh; EDM's existing language selector uses the same preference.

Testing results are analysed in English once. `prompts/insights/content-testing-translation.md` translates only the human-readable fields of those saved results. Names, reporting dates, identifiers, numeric deltas, and source URLs remain unchanged. Shared Chinese payloads are saved in `public.testing_ai_readout_translations`, keyed by the English cache key, language, and English source hash. A new English result invalidates the old translation. Language switches only read saved results and publish already-completed translation tasks; they never enqueue analysis or translation.

The daily readout refresh also queues missing translations after publishing English analysis. To translate existing saved results without retrieving data or rerunning analysis:

```sh
node scripts/refresh-testing-readouts.mjs --translations-only
```

Translation tasks are persistent, idempotent and lower priority than questions. They are chunked to fit the existing Bridge answer contract, validate completeness and preservation of numbers/links, and only publish complete payloads. While a Chinese result is pending, the page keeps the saved English analysis visible with a short Chinese status message. Apply `supabase/migrations/20261020_site_language_and_testing_translations.sql` in the EDM database before deploying the code.

Fixed Test goal / Hypothesis use the same translation path. The 12 generated test frameworks in `framework:v1` are translated and stored under that cache key, independently of period-specific summaries. Every reporting period reuses the fixed Chinese framework. It is translated again only when the English framework payload changes, never when a viewer changes dates or language.

Channel pages and creative detail pages render fixed goal/hypothesis first, then their original performance tables/media, then the saved summary, delta and optimization recommendations. `TestReadout` accepts the existing server-rendered performance as children so one cached request supplies both analysis sections. Missing AI cache never hides performance children. Overview retains its separate executive-summary layout.

Readability: channel readouts use paired goal/hypothesis panels, explicit data boundaries, a separate recommended-action surface, individual delta cells, and dividers before detailed findings and evidence. The Setup / Performance data / Analysis section headings and their numbers are omitted. Campaign cards show AI Summary, then original performance data, then the detailed-analysis toggle. These are presentation-only changes; cached analysis and numeric performance are unchanged.

## Campaign disclosure and navigation

Campaign list cards keep the campaign header, a three-line saved AI Summary, and the original Performance data visible. Only the fixed framework and detailed recommendations/deltas start collapsed for each reporting range. View detailed analysis reveals those sections; a footer control collapses the card and returns to its heading. Changing language preserves the expanded state; a new reporting range starts collapsed. All content reuses existing cached analysis. Creative detail pages and the Social post review retain their full layout.

A fixed Campaign navigator centred at the bottom of the viewport offers a keyboard-accessible picker, previous/next actions, and return-to-heading. It discovers only the campaign cards actually rendered in the current range, tracks the campaign in view, respects reduced motion, and offsets jumps below the sticky page heading. It updates as streamed page content changes. Overview keeps its executive summary and does not expose per-campaign framework or deep creative analysis.

Presentation preference: omit analysis snapshot timestamps, fetch/generation timestamps and similar freshness annotations from the UI. Keep reporting ranges and business dates. Backend timestamps remain available for cache versioning and audit.

Deployment status (2026-10-20): the website changes are deployed and `emw3-testing-readouts.timer` is enabled in production for 09:15 UTC daily. The earlier local-only/timer-pending statements above describe implementation history. Production uses the existing shared cache and translations; deployment does not request replacement analysis.

2026-10-21 local update: Overview campaign cards now expand the full saved framework and analysis, matching channel cards, while the separate Overview executive synthesis remains unchanged. Both collapse controls remain. Campaign heading links preserve reporting parameters and navigate to the channel page with the requested campaign selected for scrolling.

Social lifetime display selects the latest successfully saved Social period from the shared cache, rather than requiring a record with today's date. A failed daily refresh therefore keeps the prior complete analysis visible; exact-date cache reads and translations still use that saved record's actual dates. Ordinary selected-period channel analysis keeps exact-range matching. Published and Format appear only on each post's Organic row, with the Paid row blank for those shared fields.

Social singleton policy (supersedes dated Social generation): Social uses the single `period:social-lifetime` cache key regardless of calendar dates. The daily batch regenerates Social from current lifetime metrics and replaces that singleton. Viewing the page does not generate analysis. Existing successful English/Chinese content is promoted by `20261021_social_lifetime_readout.sql`; older dated records remain audit history. Publication/capture dates remain internal provenance only. Other channels retain exact-period generation.

Reddit default is `Lifetime (Sep 24, 2026 – Now)` using the existing `sinceSep24` preset. Daily generation includes a separate Reddit-only cumulative record alongside Last Week, Week-to-date and Month-to-date, with the same configured ad scope and ad-first enrichment. `period:reddit-lifetime` is updated in place daily and translated to Chinese; the three exact-range caches remain independent. Lifetime records do not require cross-channel Overview synthesis. Changing dates or opening the page only reads cache.

Before deploying the Reddit lifetime batch, apply `ops/bridge-reddit-lifetime.patch` to the existing Bridge contracts and publish that service: add the Reddit lifetime label and allow five records per batch (three standard periods + Reddit lifetime + Social lifetime). `ops/bridge-testing-readout.patch` also includes this change for a fresh Bridge setup. These Bridge updates are prepared locally, not yet applied to production.


## Private creative source library

The remote Bluevua project now has `.local/creative-library/INDEX.md`, campaign indexes and per-asset Markdown. Read these observations alongside current performance, respecting publisher-caption versus local-ASR provenance and sampled-frame limits. Sources are not analytical results or business approval. The initial current-scope run contains 160 records, 75 visual descriptions, all 27 videos with sampled frames, and 18 text transcripts. See `scripts/creative-library/README.md` for tooling and `bash scripts/creative-library/update-from-local.sh` for campaign-update ingestion. No website request runs ingestion. A real unchanged rerun produced `changed: 0` without another image/model pass. The remote library and its dependency environment are private and ignored by Git.

## Creative-backed regeneration (v4)

`content-testing-v4` requires reading the current private campaign/asset Markdown before analysis and uses fresh performance input instead of prior conclusions. The dedicated AI Bluevua Content Testing conversation is persisted by the Bridge mapping; EDM Insights and account Ask AI mappings remain separate. Before replacing old Testing output, export Testing cache, translations and its scoped queue records to a private server backup, then clear only those records so old completed jobs cannot republish them. Do not clear `ai_insight_cache`, user preferences or conversation histories.

Apply `ops/bridge-testing-medium.patch` alongside the lifetime contract patch: Testing analysis uses Astra/medium, while other Dashboard modes and Slack retain their existing settings. These are incremental service patches, not a replacement of the shared host configuration. Social and Reddit lifetime remain daily refreshes; no page visit invokes generation.

### Long-running native Testing turns

The 2026-10-21 v4 deployment also applies `ops/bridge-testing-wait.patch` and `ops/bridge-testing-regressions.patch`. Testing analysis and its pure-translation jobs await native completion without the older Dashboard execution deadline. Other Dashboard modes retain their configured deadline. Testing output has a 512 KiB transport allowance; structured validation, document coverage, identities and arithmetic checks still apply. Testing translation also uses per-turn medium reasoning.

For the one already-running turn launched under the old deadline, the Dashboard connection was detached before its cancellation callback, retaining the exact native thread/turn. The shared Codex backend and Slack bridge were not restarted. This is reconciliation of the same inference, never a retry. The private SQLite backups contain its original identity and status.

`ops/reconcile-testing-native.py` runs with the Bridge's existing Python environment and checkout as its working directory. By default it only checks the exact recorded native turn. `--publish` requires that turn to be completed, validates the native schema, creates private backups, then reconciles only that Testing job and its matching conversation record. It never starts, resumes or forks analysis. After a verified completed Bridge envelope, the Dashboard queue can poll the same existing remote ID again; do not clear that ID or submit another generation request.

v4 native output is verified complete: three standard periods with 11 tests each, Reddit lifetime with two, Social lifetime with one, and 12 generated fixed frameworks. All requirement IDs and configured Meta/Reddit ad identities are represented. The exact original native result is retained privately. Its reach finding was generated in `overview.key_findings`; `overviewExecutiveSummary` reuses that AI-authored finding in the visible summary if reach is otherwise absent. `20261021_testing_overview_reach_summary.sql` applies that presentation mapping to existing caches without changing metrics or judgments. It is idempotent and does not invoke AI. Chinese translations use the mapped English payload's source hash.

Overview also fetches the shared Social lifetime key in the same cache request and shows its saved summary beside the selected-period EDM test summary. This covers the requested brief Social/EDM performance without adding Social to numerical cards, deep creative review or period-specific Social generation. Both briefs reuse their existing English/Chinese payloads.

Translation validation accepts equivalent notation such as English `one click` becoming Chinese `1 次点击`. All original numerals and URLs remain mandatory; additional digits need a corresponding source number word and may not exceed its occurrence count. URLs do not provide number-word allowances. Regression tests reject changed values, invented repeated digits and URL-derived numbers.

Chinese punctuation can immediately follow a source URL without becoming part of that URL. Translation validation and rendered evidence links handle that boundary; regression checks still reject changed URLs and changed adjacent metrics. All 11 v4 translation chunks passed validation, and all six shared Chinese cache payloads were saved with matching English source hashes (36 test summaries/actions and 12 fixed frameworks).

## Concluded Google Search: one permanent lifetime analysis

`refreshConcludedTestingReadouts()` discovers explicitly configured Google Search concluded tests. Only a `finalized: true` snapshot is eligible: its actual report start/end, treatment/control groups and daily history supply the historical metrics. The existing archived ad text/assets and supporting Drive link provide creative/background evidence. A placement experiment remains a placement experiment.

The full source document, existing Search prompt/checklist and `prompts/insights/content-testing-concluded.md` generate one English lifetime result including its fixed framework. Native `Lifetime snapshot` is a transport label; controller-owned `concludedTestId` maps it to `period:concluded:<registry-id>`, never to Social. Goal/hypothesis and analysis live together in this isolated record; global `framework:v1` is untouched. Chinese translation uses the existing source-hashed translation table and includes fixed framework fields.

The queue ID `testing-concluded:<registry-id>:lifetime:v1` is independent of dates/prompt updates and inserted with `ON CONFLICT DO NOTHING`. Completed permanent cache rows are insert-only, including when a publisher replays. Failed jobs require inspection, never automatic resubmission. The dedicated queue dashboard ID `bluevua-content-testing-concluded` prevents an older production publisher from treating this result as Social before the website code is released; mode `testing_readout` still reuses AI Bluevua · Content Testing.

Daily refresh discovers newly finalized tests but skips already saved ones. A failed concluded job does not stop active-channel daily generation. For an explicit one-time run without starting the daily batch:

```sh
node scripts/refresh-testing-readouts.mjs --concluded-only
```

This writes the shared EDM Supabase cache for both local and production readers. Reading a page never generates analysis or calls an advertising API. Newly configured tests use unique registry IDs; do not recycle an existing concluded ID for a different experiment. Existing permanent results are only replaced by an explicit, separately authorized maintenance operation.

Permanent concluded rows and their translations/queue provenance must be excluded from any future active Testing cache reset or prompt-version regeneration. A cleanup of daily `period:*` keys must explicitly preserve `period:concluded:*`; no retention policy should expire these records.

### 2026-10-22 scope and copy revision

Overview financial/CTR inputs retain configured Reddit testing ad rows in specified groups, matching Business Performance cards, plus the existing configured Google and Meta scope. Both configured Reddit campaigns are included after the rename fix; non-selected ads/groups are excluded. EDM revenue/orders contribute to headline totals and unique clicks/Delivered to overall CTR; paid ROAS still excludes EDM. Reddit Campaign membership uses stable official IDs so the Conversion→Retargeting rename does not remove historical/current results; current official names remain visible and whole-campaign totals remain background, not additional Overview spend.

The prompt requires headline dates, Spend, Reach, revenue, paid ROAS, purchases and CTR before channel/messaging insights and actionable priorities. Shorthand labels must include their actual ad names. Checklist markers are validated on the raw native response and stripped before dashboard cache publication; raw queue evidence retains audit coverage. PMax summaries now follow the source's updated maximum of 200 English words. The daily job key includes a hash of the source and prompt so an edited prompt creates one new revision rather than silently reusing today's previous response. Stable framework refresh remains campaign/prompt-version controlled; concluded lifetime records remain permanent.

Prompt-only updates are read from disk when a new job is prepared and do not require rebuilding Next.js. Runtime code, aggregation or rendering changes still require a build/release. Keep local/Git and EC2 prompt files synchronized. Existing jobs keep their original frozen prompt/input; prompt edits do not mutate running tasks or old database results.

Performance-source boundary: AI Bluevua uses only the Dashboard's supplied frozen metrics, histories and totals. It must not fetch/refresh ad/reporting API metrics or substitute old conversation numbers. Background/brand/test-plan/creative research through project files and connected sources is still allowed. Missing performance is reported rather than filled from another capture or period.

Daily runner finalization decorates shorthand/bare Meta and Reddit ad IDs with the actual names in the same frozen input (`scripts/testing-readout-names.mjs`). This is deterministic display formatting, not a new inference. After matching Chinese translations are ready, English/Chinese cache payloads and their source hash are updated in one transaction; numeric fields, URLs, test identities, generation timestamps and concluded records are unchanged. Repeated finalization is idempotent. The runner is loaded at invocation and does not require rebuilding Next.js.

## Isolated translation and usage metering (2026-10-22)

The Bridge-only `ops/bridge-testing-translation-low.patch` plus `ops/testing-translation-runtime.py` (installed as `anc_bridge/dashboard/translation_runtime.py`) changes only `bluevua-testing-translation`. Each chunk starts a fresh ephemeral thread in a temporary directory outside the Bluevua repository, uses `low` reasoning, and sends only the translation instructions and English string dictionary. It does not resume the Content Testing analysis conversation or send project/team memory, metrics snapshots, attachments, or previous analysis. The model remains Astra; other Dashboard analysis and Ask AI settings are unchanged.

Existing daily orchestration remains responsible for queuing translations immediately after publishing English, validating numbers/links/completeness and writing source-hashed Chinese payloads to the shared database. Fixed frameworks and concluded lifetime results retain their existing reuse rules. A website rebuild is unnecessary for this Bridge runtime change.

Private per-chunk records are appended to `/home/ubuntu/work/anc-slack-bridge/.state/dashboard/translation-usage/YYYY-MM-DD.jsonl` (UTC filenames, mode 600). Records contain IDs, character counts, timestamps, reasoning/model, completion state, native token usage when emitted, and account quota snapshots before/after. They do not store translated/source prose. Metering failure must not fail translation; unavailable measurements stay unavailable. Account quota differences include concurrent work and must not be presented as exact translation-only percentages, especially across quota resets.

After the next daily run, inspect the Chicago date using `python3 scripts/testing-translation-usage.py --date 2026-10-23` on EC2. The summary distinguishes missing token measurements from zero and includes failed attempts. The daily timer remains 09:15 UTC (04:15 CT during daylight saving time); this change does not add a second generation schedule. Remote regression test: `python -m unittest discover -s tests -p test_testing_translation_runtime.py` in the Bridge venv.

Deployment persistence: `deploy.sh` only pulls/builds this Dashboard checkout; it does not replace the sibling `/home/ubuntu/work/anc-slack-bridge` runtime. Keep the patch and helper in Git so a future Bridge reinstall can restore them. On a fresh Bridge matching the patch base, install `ops/testing-translation-runtime.py` as `src/anc_bridge/dashboard/translation_runtime.py`, dry-run then apply `ops/bridge-testing-translation-low.patch` with `patch -p1`, install the companion test under `tests/`, and run it in the Bridge venv before restarting the idle Dashboard Bridge. If the patch no longer applies, reconcile with the current provider rather than overwriting it. Do not restart the shared Codex runtime or rebuild Next.js for this change. Runtime-only synchronization commits may use `[skip ci]` to avoid the push-triggered website workflow.

## Testing input bounds and daily recovery (2026-10-23)

The daily frozen input crossed the generic 30,000-node guard (29,769 on October 22; 30,182 on October 23). The Bridge rejected it before creating a remote job, so no model invocation or translation occurred. `ops/bridge-testing-input-bounds.patch` plus `ops/testing-input-runtime.py` (install as `anc_bridge/dashboard/testing_input.py`) fixes the transport rather than changing the stored snapshot or querying fresh metrics.

For Testing analysis only, exactly equal creative-catalog entries are replaced with explicit paths to the same objects already supplied in period test data. Canonical JSON comparison preserves numeric types, values and distinct period metrics. The October 23 input becomes 25,522 nodes with all five periods and 36 test instances retained. The frozen queue body stays unchanged for publication, ad-name formatting and audit.

If the compact batch still exceeds 30,000 nodes, the provider executes bounded period requests sequentially and merges their structured `period_readouts` into the original parent batch. Each part retains all tests for its period, document requirements, static framework and relevant history/catalog context; no financial totals or creative rows are truncated. Existing publication validation still checks all expected periods, identities, document coverage and arithmetic before publishing. Ordinary Dashboard/Ask AI requests retain the original 30,000-node guard; the depth-20 and HTTP 2 MiB limits remain. Testing preplanning additionally caps raw nodes at 200,000. A single period that cannot fit is rejected explicitly (`testing_period_complexity`) rather than silently losing data. Private node-count/part-count telemetry contains no source text.

Install after the low-reasoning translation patch, dry-run/apply with `patch -p1`, and run `ops/test_testing_input_runtime.py` in the Bridge test environment before restarting the idle Dashboard Bridge. Keep both helpers installed; neither patch requires a Next.js build. The October 23 retry reuses the exact failed request ID and frozen body only after confirming `remote_id IS NULL` and the original 422 schema rejection; a private backup precedes the retry. Never reset an uncertain or already-submitted inference as a shortcut.

### Weekly Last Week reuse

`prepareTestingWeeklyReuse` in `scripts/testing-weekly-reuse.mjs` runs before the queue's first submission. Last Week is omitted from a new batch only if the exact Last Week range already has a published cache and a completed, published batch from the same prompt revision. That normally means one new Last Week report on Tuesday; a missed/failed Tuesday run is filled on the next daily run. A changed prompt revision or framework regeneration forces a fresh report. Already-running/submitted jobs are never rewritten. Other daily periods and Lifetime continue normally. Only the cached weekly period is omitted; each remaining period retains all configured tests. Duplicate catalog financial rows are remapped to an actually supplied period. The stored `reused_weekly_periods` metadata makes reuse explicit; the old weekly English/Chinese cache remains available and is not translated again while its source hash stays unchanged.

This optimization is in the separately loaded queue worker, so updating/restarting that worker requires no Next.js rebuild and does not interrupt the native analysis already in flight. Keep `scripts/testing-weekly-reuse.mjs` alongside `scripts/ai-queue-worker.mjs` during deployment. Run `node --test scripts/testing-weekly-reuse.test.mjs` for exact-range/revision, catch-up and active-job coverage.
