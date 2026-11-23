\set ON_ERROR_STOP on
BEGIN;

ALTER TABLE script_lab.rule_dimensions ADD COLUMN IF NOT EXISTS import_appearance jsonb;

CREATE OR REPLACE FUNCTION script_lab.import_variable_pool(
  scope text, email text, input jsonb
) RETURNS TABLE(dimensions integer, added integer, skipped integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, script_lab AS $body$
BEGIN
  IF scope NOT IN ('internal', 'customer') OR coalesce(email, '') = '' THEN
    RAISE EXCEPTION 'Invalid import actor';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(input->'dimensions') AS incoming(code text, layer text)
    JOIN script_lab.rule_dimensions existing USING (code)
    WHERE existing.layer <> incoming.layer
  ) THEN
    RAISE EXCEPTION 'Dimension layer conflict' USING ERRCODE = '23505';
  END IF;

  WITH saved AS (
    INSERT INTO script_lab.rule_dimensions (code, layer, label, import_appearance)
    SELECT code, layer, label, appearance
    FROM jsonb_to_recordset(input->'dimensions') AS incoming(code text, layer text, label text, appearance jsonb)
    ON CONFLICT (code) DO NOTHING
    RETURNING *
  )
  INSERT INTO script_lab.rule_history (project_slug, rule_id, action, actor_scope, actor_email, after_rule)
  SELECT 'biceek', gen_random_uuid(), 'create', scope, email, to_jsonb(saved) || '{"kind":"dimension"}'::jsonb FROM saved;
  GET DIAGNOSTICS dimensions = ROW_COUNT;

  -- Use the same rule defaults and history fields as a single create.
  WITH saved AS (
    INSERT INTO script_lab.rules (project_slug, dimension, code, label, notes, enabled, status, default_selected, fields)
    SELECT 'biceek', dimension, code, label, notes, status IN ('enabled','caution','phase-two'), status, default_selected, fields
    FROM jsonb_to_recordset(input->'rules') AS incoming(
      dimension text, code text, label text, notes text, status text, default_selected boolean, fields jsonb
    )
    ON CONFLICT (project_slug, dimension, code) DO NOTHING
    RETURNING *
  )
  INSERT INTO script_lab.rule_history (project_slug, rule_id, action, actor_scope, actor_email, after_rule)
  SELECT 'biceek', saved.id, 'create', scope, email, to_jsonb(saved) FROM saved;
  GET DIAGNOSTICS added = ROW_COUNT;

  skipped = jsonb_array_length(input->'rules') - added;
  RETURN NEXT;
END;
$body$;

REVOKE ALL ON FUNCTION script_lab.import_variable_pool(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION script_lab.import_variable_pool(text, text, jsonb) TO ubuntu;
COMMIT;
