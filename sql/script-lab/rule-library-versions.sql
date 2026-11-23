\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS script_lab.rule_library_versions (
  project_slug text PRIMARY KEY REFERENCES script_lab.projects(slug),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0)
);

INSERT INTO script_lab.rule_library_versions (project_slug)
VALUES ('biceek')
ON CONFLICT (project_slug) DO NOTHING;

CREATE OR REPLACE FUNCTION script_lab.bump_rule_library_version()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, script_lab AS $body$
BEGIN
  UPDATE script_lab.rule_library_versions
    SET version = version + 1
    WHERE project_slug = 'biceek';
  RETURN NULL;
END;
$body$;

DROP TRIGGER IF EXISTS script_lab_rule_library_version ON script_lab.rules;
CREATE TRIGGER script_lab_rule_library_version
AFTER INSERT OR UPDATE OR DELETE ON script_lab.rules
FOR EACH ROW EXECUTE FUNCTION script_lab.bump_rule_library_version();

DROP TRIGGER IF EXISTS script_lab_dimension_library_version ON script_lab.rule_dimensions;
CREATE TRIGGER script_lab_dimension_library_version
AFTER INSERT OR UPDATE OR DELETE ON script_lab.rule_dimensions
FOR EACH ROW EXECUTE FUNCTION script_lab.bump_rule_library_version();

REVOKE ALL ON FUNCTION script_lab.bump_rule_library_version() FROM PUBLIC;
GRANT SELECT ON script_lab.rule_library_versions TO ubuntu;
COMMIT;
