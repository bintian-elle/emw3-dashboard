# Local Google Ads creative archive

Google sunset developer tokens on September 9, 2026. This integration uses OAuth only, following https://developers.google.com/google-ads/api/docs/api-policy/developer-token .

Server-only environment configuration:

- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_SECRET`: OAuth client secret
- `GOOGLE_ADS_TOKEN`: OAuth refresh token
- `GOOGLE_ADS_CUSTOMER_ID`: target advertiser account
- Optional `GOOGLE_ADS_LOGIN_CUSTOMER_ID`: manager account when indirect access requires it

Run `node scripts/google-ads-creatives.mjs` manually to export the three Nonbrand content-testing campaigns plus both Brand experiment campaigns. This only reads Google Ads. No ads, campaign settings or database rows are modified.

It archives enabled, paused and removed ad inventory, RSA headlines/descriptions/pinning/paths/final URLs, campaign/ad-group linked assets, image binaries and YouTube references. Files are private and excluded from Git under `.state/google-creatives` (override with `GOOGLE_ADS_CREATIVE_DIR`); preserve this directory during future deployment/migration. Images are served through a login-protected API route, never `public/`. Videos link to YouTube; their original video binaries are not downloaded.

This is the inventory returned by Google at capture time, not a reconstruction of exact creative versions that served during the historical test. Previously removed or edited content may not remain available through the API. The archive is not refreshed on page visits; re-run the explicit export command when needed. Performance snapshots remain a separate process and are not overwritten by the creative export.

Google Testing Performance links each real ad group to `/bluevua/testing/google/search/<adGroupId>`. The concluded card links each experiment arm to its four actual ad groups, then to the same creative detail pages. Campaign-level associated assets are shown alongside each group's own assets and deduplicated by asset ID.

Initial verification: OAuth exchange and GAQL query succeeded without a developer token; 5 campaigns, 20 groups, 261 ads, 814 asset associations and 21 downloaded images, with no export warnings. No remote deployment or scheduler change performed.

Search ad detail cards now use Google Search-style mobile preview frames. Each card offers three deterministic example combinations using archived RSA text and respecting pinned headline/description positions. Business name, business logo, display paths and sample sitelinks come from the archived associated assets. Full copy and destination links remain expandable. These are locally rendered examples, not official Google-generated previews or a record of actual served combinations; associated assets may differ in live delivery. No additional API calls occur when switching combinations.

Associated assets are now grouped into independently collapsed Ad Group and Campaign scopes, then collapsed type categories with unique asset counts. Each item shows its source group/campaign. Deduplication applies only within a scope: an asset linked at both levels remains visible in both, preserving its actual association. Associations from other ad groups are excluded; business names/logos are categorized by association field type rather than lumped into generic TEXT/IMAGE. This UI reads the existing local archive and does not fetch Google Ads again.

Clickable Ad Group names use blue link styling. Creative drill-down links carry a validated, site-local `returnTo` chain: details return to the exact experiment-arm list, and that list returns to its archive or performance origin. Performance reporting query parameters are preserved. Sidebar selection follows this origin, including after refresh, rather than classifying every `/google/...` detail as Performance. Navigation parameters are removed from unrelated sidebar links.

Preview pages omit the capture-date and introductory example disclaimer from the visible header. Ads sort by status: ENABLED/ACTIVE first, then PAUSED, then REMOVED; order within the same status stays unchanged. Capture metadata remains in the private archive.

Per-ad performance is again the detail page's primary view: CPA, CVR, ROAS, Orders, Revenue, Spend, CTR and CPC, with ENABLED/ACTIVE ads first. Selecting an ad expands its Google-style preview inline; associated assets follow the data table. `node scripts/google-ads-ad-performance.mjs` reads daily ad performance from Google Ads into the private `ad-performance.json` archive. The initial query covers January 1, 2025 through October 7, 2026 (5,358 daily rows). Page visits do not call Google Ads. Performance-origin details retain the selected reporting range through nested return links; archive-origin details aggregate the experiment lifetime. Ratios are recomputed from daily totals; no-activity ads show zero amounts and undefined ratios as dashes. Missing/out-of-coverage archives show unavailable metrics rather than fabricated zeros. Re-run this explicit export when a newer reporting period is needed.

Selecting an ad now displays all three example combinations together: three columns on wide containers and stacked on narrow screens. Preview headings are Example 1, Example 2 and Example 3; ad ID/status remain in the performance row. Full-copy disclosure IDs are unique per example.
