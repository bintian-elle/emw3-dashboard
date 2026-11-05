# Staging-only staged daily analysis

`staging-daily.mjs` is a separate, opt-in staging entry point. It requires
`DEPLOYMENT_ENV=staging`, `STAGING_CONTENT_TESTING_STAGED_DAILY=1`, and
`STAGING_CONTENT_TESTING_DATABASE_URL` identifying a different database from
`KLAVIYO_DATABASE_URL`. It uses `.state/content-testing-staging-daily` and does
not start the concluded-test job. The production `daily.mjs` entry point is
unchanged. No scheduler or service is installed by these changes.

Within each channel, the runner performs one turn per configured Campaign,
then a channel turn reading those completed reports and the frozen channel
data, and finally an Overview turn reading the completed channel reports. Each
turn receives the channel prompt and readability together. Completed stage
files allow recovery without redoing earlier turns.

Current limitation: this daily entry point still saves the existing Markdown
readout and uses the existing translation stage. The staging interactive HTML,
chart and image presentation format used by prompt trials is not yet generated
or stored by this daily path. Do not describe this entry point as the same
visual-output pipeline or schedule it as a replacement until that is connected.
