# Channel-specific Chinese insight preview

Goal: Run the user's seven channel prompts serially in the existing AI Bluevua `Bluevua · Content Testing Insights` thread, synthesize Overview last, and render flexible channel-specific output locally without production cache writes.

- Freeze the latest available Dashboard input for Last Week Oct 20–26, Reddit same-period plus lifetime, and Social lifetime. Save source capture metadata and hashes, never pretend lifetime means weekly.
- Keep each prompt's own chapters and tables. Use a minimal JSON envelope with summary, Markdown sections, campaign summaries/details, and source/gap notes.
- Add master rules permitting public web/competitor/content research and EC2 Bluevua project/creative-library reads; performance remains the frozen Dashboard scope.
- Stage prompts/input in an isolated remote directory, verify the existing Insights thread is idle, and resume only that thread. Persist controller state/turn IDs/results to files, never to shared AI tables or jobs.
- Pull results to private local `.state/content-testing-preview/`; validate report identity, dates, prompt coverage, campaign/entity coverage, and Overview dependency completeness.
- Add a development-only file-backed preview route/renderer. Production always uses existing behavior. Preview reads must not run cache publication/translation/generation. Retain data tables and support each channel's own Markdown sections.
- Verify type/lint, safety/contract tests and authenticated local rendering. Do not push/deploy or modify the online scheduler/cache.

Presentation: one conclusion-first summary, channel-specific details and inline verified web/Drive/Slack links. Hide technical headers, duplicate summaries and standalone audit/source panels. Search/PMax/already-running Demand Gen remained in the previous Insights conversation per the mid-run instruction; Meta onward uses the corrected target.
