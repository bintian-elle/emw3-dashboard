import { matchesPainSelection } from "./script-lab-pain-matching";
import "server-only";

import { randomUUID } from "node:crypto";
import { complianceSelfCheckStage } from "./script-lab-review";
import { loadExampleReferences } from "./script-lab-examples";
import { listScriptLabLibrary } from "./script-lab-rule-store";
import { dimensionParticipatesInCombinations, ruleCanBeSelected } from "./script-lab-rules";
import type { SampleScript } from "./script-lab-sample-batch";
import { loadScriptLabProject } from "./script-lab-store";

const maxPreviewItems = 1000;

export async function prepareScriptLabVideoRequest(input: string[] | { sourceScript: SampleScript; sourceBatchId: string; sourceRevision: string; reviewNote: string }, visibility: "public" | "internal") {
  const [project, library, examples] = await Promise.all([loadScriptLabProject(visibility), listScriptLabLibrary(), loadExampleReferences(visibility)]);
  if (!project) return { error: "project_unavailable" } as const;

  const revision = Array.isArray(input) ? undefined : input;
  const selectedIds = Array.isArray(input) ? input : library.rules.filter(rule => ruleCanBeSelected(rule) && (
    input.sourceScript.combination.some(element => element.key === rule.dimension && element.code === rule.code)
    || (rule.default_selected && library.dimensions.some(dimension => dimension.code === rule.dimension && dimension.layer === "constraints"))
  )).map(rule => rule.id);
  const selection = new Set(selectedIds);
  const selected = library.rules.filter(rule => selection.has(rule.id) && ruleCanBeSelected(rule));
  if (selected.length !== selection.size || revision?.sourceScript.combination.some(element =>
    !selected.some(rule => rule.dimension === element.key && rule.code === element.code))) return { error: "selection_changed" } as const;
  const groups = library.dimensions.map(dimension => ({
    dimension,
    values: selected.filter(rule => rule.dimension === dimension.code).map(rule => ({
      layer_code: dimension.layer,
      dimension_code: dimension.code,
      value_code: rule.code,
      label: rule.label,
    })),
  }));
  const factors = groups.filter(({ dimension, values }) => dimensionParticipatesInCombinations(dimension) && values.length);
  if (!factors.length) return { error: "no_combinations" } as const;

  const requestedCount = revision ? 1 : factors.reduce((total, factor) => total * factor.values.length, 1);
  if (requestedCount > maxPreviewItems) return { error: "too_many_combinations", limit: maxPreviewItems } as const;

  const combinations = revision ? [factors.flatMap(factor => factor.values)] : factors.reduce<ReadonlyArray<(typeof groups)[number]["values"]>>(
    (items, factor) => items.flatMap(item => factor.values.map(value => [...item, value])),
    [[]],
  );
  const activeConstraints = selected.filter(rule =>
    groups.some(group => group.dimension.code === rule.dimension && group.dimension.layer === "constraints"));
  const eligible = combinations.filter(elements => matchesPainSelection(
    new Map(elements.map(element => [element.dimension_code, element.value_code])), activeConstraints,
  ));
  const excludedCount = requestedCount - eligible.length;
  if (!eligible.length) return { error: "pain_matching", excluded_count: excludedCount } as const;
  const fixedElements = factors.filter(factor => factor.values.length === 1).flatMap(factor => factor.values);
  const runId = randomUUID();
  const combination = [0, 1].map(language => factors.map(({ dimension, values }) => {
    if (values.length !== 1) return `${dimension.label[language]} ${values.length}`;
    const rule = selected.find(item => item.dimension === dimension.code && item.code === values[0].value_code);
    return (!language && rule?.label_en) || values[0].label;
  }).join(" × ")) as [string, string];
  return { payload: {
    schema_version: 1,
    project_name: project.brand,
    product_name: project.product,
    run_id: runId,
    batch_id: randomUUID(),
    mode: "script" as const,
    include_storyboard: true,
    rule_version: library.version,
    output_count: eligible.length,
    excluded_count: excludedCount,
    combination,
    compliance_self_check_stage: complianceSelfCheckStage,
    ...(revision && { regeneration: {
      source_batch_id: revision.sourceBatchId,
      source_script_id: revision.sourceScript.id,
      source_script_revision: revision.sourceRevision,
      original_script: revision.sourceScript.copy,
      review_note: revision.reviewNote,
    } }),
    baseline_script_id: null,
    baseline_script: null,
    excellent_examples: examples,
    selected_elements: groups.flatMap(group => group.values),
    rules: {
      dimensions: library.dimensions,
      variables: library.rules,
      active_constraints: activeConstraints,
    },
    items: eligible.map((elements, index) => ({
      item_id: `${runId}:${index + 1}`,
      selected_elements: elements,
      fixed_elements: fixedElements,
      baseline_script_id: null,
    })),
  } };
}
