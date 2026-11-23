\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS script_lab.baseline_scripts (
  project_slug text NOT NULL REFERENCES script_lab.projects(slug),
  code text NOT NULL CHECK (code ~ '^#(0[1-9]|[12][0-9]|30)$'),
  rule_id uuid UNIQUE REFERENCES script_lab.rules(id) ON DELETE SET NULL,
  source_script_id text NOT NULL CHECK (btrim(source_script_id) <> ''),
  source_url text NOT NULL CHECK (btrim(source_url) <> ''),
  synopsis text NOT NULL CHECK (btrim(synopsis) <> ''),
  source_combination text NOT NULL CHECK (btrim(source_combination) <> ''),
  opening_hook text NOT NULL CHECK (btrim(opening_hook) <> ''),
  body jsonb NOT NULL CHECK (jsonb_typeof(body) = 'array' AND jsonb_array_length(body) > 0),
  storyboard jsonb NOT NULL CHECK (jsonb_typeof(storyboard) = 'object'),
  rationale text NOT NULL CHECK (btrim(rationale) <> ''),
  compliance text NOT NULL CHECK (btrim(compliance) <> ''),
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_slug, code),
  UNIQUE (project_slug, source_script_id)
);

GRANT SELECT ON script_lab.baseline_scripts TO ubuntu;
COMMIT;
