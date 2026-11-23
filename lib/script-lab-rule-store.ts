import "server-only";

import { queryScriptLab } from "./script-lab-store";
import { ruleDimensions, type NewRuleDimension, type RuleAction, type RuleActor, type RuleDimensionDefinition, type RuleHistoryEntry, type RuleInput, type ScriptLabRule } from "./script-lab-rules";

import type { VariablePoolImport, VariablePoolImportResult } from "./script-lab-variable-pool";

const columns = "id, dimension, code, label, label_en, notes, status, default_selected, fields, revision";

function dimensionDefinition(row: NewRuleDimension): RuleDimensionDefinition {
  return { code: row.code, layer: row.layer, label: [row.label_en || row.label, row.label], appearance: row.import_appearance ?? undefined };
}

export async function getScriptLabLibraryVersion() {
  const [record] = await queryScriptLab<{ version: string }>(
    "SELECT version::text FROM script_lab.rule_library_versions WHERE project_slug = 'biceek'",
  );
  return record.version;
}

export async function listScriptLabLibrary() {
  const [library] = await queryScriptLab<{ dimensions: NewRuleDimension[]; rules: ScriptLabRule[]; version: string }>(
    `SELECT version::text,
      (SELECT coalesce(jsonb_agg(d ORDER BY d.created_at, d.code), '[]'::jsonb)
       FROM script_lab.rule_dimensions d WHERE d.label IS NOT NULL) AS dimensions,
      (SELECT coalesce(jsonb_agg(r), '[]'::jsonb) FROM (
        SELECT ${columns} FROM script_lab.rules WHERE project_slug = 'biceek' AND NOT archived
        ORDER BY dimension, sort_order, code
      ) r) AS rules
      FROM script_lab.rule_library_versions WHERE project_slug = 'biceek'`,
  );
  return { dimensions: [...ruleDimensions, ...library.dimensions.map(dimensionDefinition)], rules: library.rules, version: library.version };
}

export async function addScriptLabDimension(input: NewRuleDimension, actor: RuleActor) {
  const [row] = await queryScriptLab<NewRuleDimension>(
    "SELECT code, layer, label, label_en FROM script_lab.add_rule_dimension($1, $2, $3::jsonb)",
    [actor.scope, actor.email, JSON.stringify(input)],
  );
  return row && dimensionDefinition(row);
}

export async function importScriptLabVariablePool(input: VariablePoolImport, actor: RuleActor) {
  const [result] = await queryScriptLab<VariablePoolImportResult>(
    "SELECT dimensions, added, skipped FROM script_lab.import_variable_pool($1, $2, $3::jsonb)",
    [actor.scope, actor.email, JSON.stringify(input)],
  );
  return result;
}

export async function changeScriptLabRule(action: RuleAction, actor: RuleActor, id: string, revision: number, rule?: RuleInput) {
  const [changed] = await queryScriptLab<ScriptLabRule>(
    `SELECT ${columns} FROM script_lab.change_rule($1, $2, $3, nullif($4, '')::uuid, $5::integer, $6::jsonb)`,
    [action, actor.scope, actor.email, id, String(revision), JSON.stringify(rule ?? null)],
  );
  return changed;
}

export function getScriptLabRuleHistory(actor: RuleActor, page: number, personal: boolean) {
  const customerFilter = personal ? "AND actor_scope = $2 AND actor_email = $3" : "";
  const params = personal ? [String((page - 1) * 30), actor.scope, actor.email] : [String((page - 1) * 30)];
  return queryScriptLab<RuleHistoryEntry>(
    `SELECT id, action, actor_email, changed_at, before_rule, after_rule
     FROM script_lab.rule_history WHERE project_slug = 'biceek' ${customerFilter}
     ORDER BY changed_at DESC, id DESC LIMIT 31 OFFSET $1::integer`,
    params,
  );
}
