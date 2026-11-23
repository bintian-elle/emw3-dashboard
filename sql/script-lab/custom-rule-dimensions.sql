\set ON_ERROR_STOP on
BEGIN;
ALTER TABLE script_lab.rule_dimensions
  ADD COLUMN IF NOT EXISTS label text CHECK (length(btrim(label)) BETWEEN 1 AND 160),
  ADD COLUMN IF NOT EXISTS label_en text NOT NULL DEFAULT '' CHECK (length(label_en) <= 160),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION script_lab.add_rule_dimension(
  scope text, email text, input jsonb
) RETURNS SETOF script_lab.rule_dimensions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, script_lab AS $body$
DECLARE
  saved script_lab.rule_dimensions%ROWTYPE;
BEGIN
  IF scope NOT IN ('internal','customer') OR coalesce(email,'') = ''
      OR coalesce(input->>'code','') !~ '^[A-Z][A-Z0-9_-]{0,31}$'
      OR coalesce(btrim(input->>'label'),'') = '' THEN
    RAISE EXCEPTION 'Invalid dimension or actor';
  END IF;

  INSERT INTO script_lab.rule_dimensions (code, layer, label, label_en)
  VALUES (input->>'code', input->>'layer', input->>'label', coalesce(input->>'label_en',''))
  ON CONFLICT (code) DO NOTHING RETURNING * INTO saved;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO script_lab.rule_history (project_slug, rule_id, action, actor_scope, actor_email, after_rule)
  VALUES ('biceek', gen_random_uuid(), 'create', scope, email, to_jsonb(saved) || '{"kind":"dimension"}'::jsonb);
  RETURN NEXT saved;
END;
$body$;

REVOKE ALL ON FUNCTION script_lab.add_rule_dimension(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION script_lab.add_rule_dimension(text, text, jsonb) TO ubuntu;
COMMIT;
