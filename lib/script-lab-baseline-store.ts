import "server-only";

import { queryScriptLab } from "./script-lab-store";
import type { BaselineLibrary, BaselineScript } from "./script-lab-baselines";

function baselineQuery(visibility: "public" | "internal") {
  return `WITH project_baselines AS (
       SELECT b.*, coalesce(r.label, b.synopsis) AS title, r.fields->>'vals' AS configuration
       FROM script_lab.baseline_scripts b
       JOIN script_lab.projects p ON p.slug=b.project_slug
       LEFT JOIN script_lab.rules r ON r.id=b.rule_id AND r.project_slug=b.project_slug
         AND r.code=b.code AND r.dimension='BASE' AND NOT r.archived
       WHERE p.slug='biceek'${visibility === "public" ? " AND p.is_published" : ""}
     )`;
}

const versionSql = "(SELECT md5(coalesce(string_agg(md5(to_jsonb(b)::text), ',' ORDER BY code), '')) FROM project_baselines b)";

export async function getBaselineVersion(visibility: "public" | "internal") {
  const [record] = await queryScriptLab<{ version: string }>(
    `${baselineQuery(visibility)} SELECT ${versionSql} AS version`,
  );
  return record.version;
}

export async function loadBaselineSnapshot(visibility: "public" | "internal") {
  const [record] = await queryScriptLab<{ version: string; scripts: BaselineScript[] }>(
    `${baselineQuery(visibility)}
     SELECT ${versionSql} AS version,
       (SELECT coalesce(jsonb_agg(to_jsonb(b) - 'project_slug' - 'rule_id' - 'imported_at' ORDER BY code), '[]'::jsonb)
        FROM project_baselines b) AS scripts`,
  );
  return record;
}

export async function loadScriptLabBaselines(code: string, visibility: "public" | "internal"): Promise<BaselineLibrary> {
  const [library] = await queryScriptLab<BaselineLibrary>(
    `${baselineQuery(visibility)}
     SELECT
       (SELECT coalesce(jsonb_agg(jsonb_build_object('code', code, 'source_script_id', source_script_id, 'title', title) ORDER BY code), '[]'::jsonb)
        FROM project_baselines) AS scripts,
       (SELECT to_jsonb(detail) FROM (
         SELECT code, source_script_id, title, source_url, synopsis, source_combination, configuration,
                opening_hook, body, storyboard, rationale, compliance
         FROM project_baselines WHERE code=$1
       ) detail) AS selected`,
    [code],
  );
  return library;
}
