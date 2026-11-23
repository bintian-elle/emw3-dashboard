import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { complianceCheckStatuses, sameComplianceTarget, type ComplianceReport, type ComplianceTarget } from "./script-lab-compliance";
import { currentScriptRevision, reviewBatchId, sameScriptRevision } from "./script-lab-review-store";
import type { ScriptRevision } from "./script-lab-review";
import { sampleStoryboards } from "./script-lab-sample-batch";

type StoryboardTarget = { source: ScriptRevision; target: ComplianceTarget };
const localState = globalThis as typeof globalThis & {
  scriptLabCompliancePreview?: {
    storyboards: Map<string, StoryboardTarget>;
    reports: Map<string, ComplianceReport>;
  };
};
const state = localState.scriptLabCompliancePreview ??= { storyboards: new Map(), reports: new Map() };

function key(target: Pick<ComplianceTarget, "batch_id" | "artifact_kind" | "artifact_id">) {
  return JSON.stringify([target.batch_id, target.artifact_kind, target.artifact_id]);
}

function storyboardRevision(batchId: string, source: ScriptRevision) {
  return createHash("sha256").update(JSON.stringify([batchId, source, sampleStoryboards.get(source.script_id)])).digest("hex");
}

export function registerPreviewStoryboards(scripts: ScriptRevision[]) {
  const runId = randomUUID();
  const targets = scripts.map(source => {
    const target: ComplianceTarget = {
      batch_id: runId, artifact_kind: "storyboard", artifact_id: source.script_id,
      artifact_revision: storyboardRevision(runId, source),
    };
    state.storyboards.set(key(target), { source, target });
    return target;
  });
  return { runId, targets };
}

export function currentComplianceTarget(input: Pick<ComplianceTarget, "batch_id" | "artifact_kind" | "artifact_id">) {
  if (input.artifact_kind === "script") {
    const script = input.batch_id === reviewBatchId ? currentScriptRevision(input.artifact_id) : undefined;
    return script && { ...input, artifact_revision: script.script_revision };
  }
  const entry = state.storyboards.get(key(input));
  return entry && sameScriptRevision(entry.source)
    ? { ...entry.target, artifact_revision: storyboardRevision(entry.target.batch_id, entry.source) }
    : undefined;
}

export function readPreviewCompliance(target: ComplianceTarget) {
  const report = state.reports.get(key(target));
  return report && sameComplianceTarget(report, target) ? report : null;
}

function text(value: unknown, limit = 250) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}

export function parsePreviewCompliance(value: unknown): ComplianceReport | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const report = value as ComplianceReport;
  if (report.status !== "completed" || !["script", "storyboard"].includes(report.artifact_kind)
    || !text(report.batch_id) || !text(report.artifact_id) || typeof report.artifact_revision !== "string"
    || !/^[a-f0-9]{64}$/.test(report.artifact_revision)
    || !text(report.run_id) || !text(report.item_id) || !text(report.rule_version)
    || !Array.isArray(report.checks) || !report.checks.length || report.checks.length > 100) return;
  if (!report.checks.every(check => check && text(check.check_id) && complianceCheckStatuses.includes(check.status)
    && (check.rule_id === null || text(check.rule_id)) && (check.field_path === null || text(check.field_path))
    && (check.shot_no === null || (report.artifact_kind === "storyboard" && Number.isSafeInteger(check.shot_no) && check.shot_no > 0))
    && text(check.note, 2000) && Array.isArray(check.evidence_refs) && check.evidence_refs.length <= 20
    && check.evidence_refs.every(ref => text(ref, 1000)))) return;
  if (new Set(report.checks.map(check => check.check_id)).size !== report.checks.length) return;
  const { status, batch_id, artifact_kind, artifact_id, artifact_revision, run_id, item_id, rule_version, checks } = report;
  return {
    status, batch_id, artifact_kind, artifact_id, artifact_revision, run_id, item_id, rule_version,
    checks: checks.map(({ check_id, rule_id, status, field_path, shot_no, note, evidence_refs }) => ({
      check_id, rule_id, status, field_path, shot_no, note, evidence_refs,
    })),
  };
}

export function savePreviewCompliance(report: ComplianceReport) {
  const current = currentComplianceTarget(report);
  if (!current || !sameComplianceTarget(current, report)) return false;
  if (report.artifact_kind === "storyboard" && report.run_id !== current.batch_id) return false;
  state.reports.set(key(report), report);
  return true;
}
