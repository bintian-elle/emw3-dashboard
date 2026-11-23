\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE IF NOT EXISTS script_lab.script_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_slug text NOT NULL REFERENCES script_lab.projects(slug),
  batch_id text NOT NULL,
  script_id text NOT NULL,
  script_revision text NOT NULL CHECK (script_revision ~ '^[0-9a-f]{64}$'),
  decision text NOT NULL CHECK (decision IN ('approved','changes_requested','rejected')),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 2000),
  actor_scope text NOT NULL CHECK (actor_scope IN ('internal','customer')),
  actor_email text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS script_reviews_current
  ON script_lab.script_reviews (project_slug, batch_id, script_id, script_revision, id DESC);
GRANT SELECT, INSERT ON script_lab.script_reviews TO ubuntu;
GRANT USAGE ON SEQUENCE script_lab.script_reviews_id_seq TO ubuntu;
COMMIT;
