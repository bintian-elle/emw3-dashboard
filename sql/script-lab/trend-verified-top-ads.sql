-- Manually verified on the UK Creative Center 7-day dashboard on 2026-11-23.
WITH cards (ad_id, title, likes, ctr, budget) AS (
  VALUES ('7709154596657610772', 'Celebrities & Gossip', '0', 'Top 77%', 'Low'),
         ('7692920206771486738', 'Travel Agencies & Services', '0', 'Top 93%', 'Low'),
         ('7706530852444651538', 'Games (By Genre)', '0', 'Top 90%', 'Low'),
         ('7709373737909452820', 'Monthly Installment of AED4,000', '265', 'Top 51%', 'Medium')
)
INSERT INTO script_lab.trend_references (id, item, checked_at, expires_at)
SELECT 'top-ads:' || ad_id, jsonb_build_object(
  'id', 'top-ads:' || ad_id, 'source', 'tiktok', 'kind', 'ad', 'title', title,
  'url', 'https://ads.tiktok.com/business/creativecenter/topads/' || ad_id || '/pad/en?countryCode=GB&period=7',
  'market', 'GB', 'publishedAt', NULL, 'coverageHours', 168, 'hashtag', 'Top Ads',
  'metrics', jsonb_build_array(
    jsonb_build_object('label', 'likes', 'value', likes),
    jsonb_build_object('label', 'ctr', 'value', ctr),
    jsonb_build_object('label', 'budget', 'value', budget)
  )
), '2026-11-23 00:00:00+00', '2026-11-30 00:00:00+00'
FROM cards
ON CONFLICT (id) DO NOTHING;
