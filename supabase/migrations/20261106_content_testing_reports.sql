-- Isolated storage for durable Content Testing reports. Existing tables are untouched.
CREATE SCHEMA IF NOT EXISTS content_testing_reports;
REVOKE ALL ON SCHEMA content_testing_reports FROM PUBLIC;

CREATE TABLE IF NOT EXISTS content_testing_reports.runs (
  id text PRIMARY KEY,
  report_kind text NOT NULL CHECK (report_kind IN ('daily','weekly','monthly','custom')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  comparison_start date NOT NULL,
  comparison_end date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','running','completed','failed')),
  source_checked_at timestamptz,
  source_freshness jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt_versions jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (period_start <= period_end AND comparison_start <= comparison_end),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS content_testing_runs_period_idx
  ON content_testing_reports.runs (report_kind, period_start, period_end, completed_at DESC);

CREATE TABLE IF NOT EXISTS content_testing_reports.reports (
  run_id text NOT NULL REFERENCES content_testing_reports.runs(id) ON DELETE RESTRICT,
  channel text NOT NULL,
  scope text NOT NULL DEFAULT 'period',
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, channel, scope),
  CHECK (jsonb_typeof(report) = 'object' AND report ? 'en' AND report ? 'zh')
);

CREATE TABLE IF NOT EXISTS content_testing_reports.media (
  run_id text NOT NULL REFERENCES content_testing_reports.runs(id) ON DELETE RESTRICT,
  media_key text NOT NULL,
  mime_type text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  body bytea NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_id, media_key)
);
REVOKE ALL ON ALL TABLES IN SCHEMA content_testing_reports FROM PUBLIC;
