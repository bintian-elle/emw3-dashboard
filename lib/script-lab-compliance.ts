export type ComplianceTarget = {
  batch_id: string;
  artifact_kind: "script" | "storyboard";
  artifact_id: string;
  artifact_revision: string;
};

export const complianceCheckStatuses = ["passed", "failed", "needs_verification", "not_applicable"] as const;

export type ComplianceReport = ComplianceTarget & {
  status: "completed";
  run_id: string;
  item_id: string;
  rule_version: string;
  storyboard_revision?: string;
  checks: {
    check_id: string;
    rule_id: string | null;
    status: typeof complianceCheckStatuses[number];
    field_path: string | null;
    shot_no: number | null;
    note: string;
    evidence_refs: string[];
  }[];
};

export function sameComplianceTarget(a: ComplianceTarget, b: ComplianceTarget) {
  return a.batch_id === b.batch_id && a.artifact_kind === b.artifact_kind
    && a.artifact_id === b.artifact_id && a.artifact_revision === b.artifact_revision;
}
