export const scriptReviewDecisions = ["approved", "changes_requested", "rejected"] as const;
export type ScriptReviewDecision = typeof scriptReviewDecisions[number];
export type ScriptReview = {
  approval_id?: string;
  script_id: string;
  script_revision: string;
  decision: ScriptReviewDecision;
  note: string;
};
export type ScriptRevision = { script_id: string; script_revision: string };
export const complianceSelfCheckStage = "after_generation" as const;
