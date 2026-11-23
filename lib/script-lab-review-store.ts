import "server-only";

import { createHash } from "node:crypto";
import { sampleScriptBatch } from "./script-lab-sample-batch";
import { queryScriptLab } from "./script-lab-store";
import type { RuleActor } from "./script-lab-rules";
import type { ScriptReview, ScriptRevision } from "./script-lab-review";

export const reviewBatchId = sampleScriptBatch.id;
export const currentScriptRevisions = sampleScriptBatch.scripts.map(script => ({
  script_id: script.id,
  script_revision: createHash("sha256").update(JSON.stringify(script)).digest("hex"),
}));

export function currentScriptRevision(scriptId: unknown) {
  return currentScriptRevisions.find(script => script.script_id === scriptId);
}

export function loadScriptReviews(visibility: "public" | "internal", batchId = reviewBatchId, revisions = currentScriptRevisions) {
  return queryScriptLab<ScriptReview>(
    `SELECT DISTINCT ON (r.script_id) r.script_id, r.script_revision, r.decision, r.note, r.id::text AS approval_id
       FROM script_lab.script_reviews r
       JOIN script_lab.projects p ON p.slug=r.project_slug
       JOIN jsonb_to_recordset($2::jsonb) AS expected(script_id text, script_revision text)
         ON expected.script_id=r.script_id AND expected.script_revision=r.script_revision
       WHERE r.project_slug='biceek' AND r.batch_id=$1${visibility === "public" ? " AND p.is_published" : ""}
       ORDER BY r.script_id, r.id DESC`,
    [batchId, JSON.stringify(revisions)],
  );
}

export async function saveScriptReview(review: ScriptReview, actor: RuleActor, visibility: "public" | "internal", batchId = reviewBatchId) {
  const [result] = await queryScriptLab<ScriptReview>(
    `INSERT INTO script_lab.script_reviews
       (project_slug, batch_id, script_id, script_revision, decision, note, actor_scope, actor_email)
       SELECT p.slug, $1, $2, $3, $4, $5, $6, $7 FROM script_lab.projects p
       WHERE p.slug='biceek'${visibility === "public" ? " AND p.is_published" : ""}
       RETURNING script_id, script_revision, decision, note, id::text AS approval_id`,
    [batchId, review.script_id, review.script_revision, review.decision, review.note, actor.scope, actor.email],
  );
  return result;
}

export function sameScriptRevision(value: ScriptRevision) {
  return currentScriptRevision(value.script_id)?.script_revision === value.script_revision;
}
