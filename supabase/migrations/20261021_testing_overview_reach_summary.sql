-- Move already AI-authored reach evidence into the visible executive summary.
-- Preserve native results, facts, recommendations and all existing detail.
BEGIN;
UPDATE public.testing_ai_readout_cache
SET payload = jsonb_set(payload, '{overview,executive_summary}', to_jsonb(
  (payload #>> '{overview,executive_summary}') || ' ' ||
  regexp_replace(payload #>> '{overview,key_findings,0}', '^\[OV-OVERALL\]\s*', '')
)), updated_at = now()
WHERE readout_type = 'period'
  AND period_label IN ('Last Week (Tue–Mon)', 'Week-to-date', 'Month-to-date')
  AND payload #>> '{overview,executive_summary}' IS NOT NULL
  AND payload #>> '{overview,executive_summary}' !~* '\mreach\M'
  AND payload #>> '{overview,key_findings,0}' LIKE '[OV-OVERALL]%'
  AND payload #>> '{overview,key_findings,0}' ~* '\mreach\M';
COMMIT;
