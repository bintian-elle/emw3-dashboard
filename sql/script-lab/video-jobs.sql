\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE IF NOT EXISTS script_lab.video_jobs (
  id uuid PRIMARY KEY,
  project_slug text NOT NULL REFERENCES script_lab.projects(slug),
  batch_id uuid NOT NULL UNIQUE,
  mode text NOT NULL CHECK (mode IN ('script', 'storyboard')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  stage text NOT NULL DEFAULT 'queued',
  requested_by text NOT NULL,
  requested_name text NOT NULL,
  payload jsonb NOT NULL,
  total integer NOT NULL CHECK (total > 0),
  processed integer NOT NULL DEFAULT 0 CHECK (processed >= 0 AND processed <= total),
  result jsonb,
  error_code text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  heartbeat_at timestamptz,
  lease_id uuid,
  events jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS video_jobs_queue ON script_lab.video_jobs (project_slug, submitted_at, id) WHERE status = 'queued';
CREATE UNIQUE INDEX IF NOT EXISTS video_jobs_worker ON script_lab.video_jobs (project_slug) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS video_jobs_visible ON script_lab.video_jobs (project_slug, mode, submitted_at DESC);
GRANT SELECT, INSERT, UPDATE ON script_lab.video_jobs TO ubuntu;
COMMIT;
