import "server-only";

import { sampleScriptBatch, sampleStoryboards } from "./script-lab-sample-batch";
import { queryScriptLab } from "./script-lab-store";

export function listExamples(visibility: "public" | "internal") {
  return queryScriptLab<{ batch_id: string; script_id: string; title: [string, string]; saved_at: string }>(
    `SELECT substr(e.batch_id,9) AS batch_id, e.script_id, e.note::jsonb AS title, e.reviewed_at AS saved_at
     FROM (SELECT DISTINCT ON (batch_id,script_id) * FROM script_lab.script_reviews
           WHERE project_slug='biceek' AND batch_id LIKE 'example:%' ORDER BY batch_id,script_id,id DESC) e
     JOIN script_lab.projects p ON p.slug=e.project_slug
     WHERE e.decision='approved' ${visibility === "public" ? "AND p.is_published" : ""} ORDER BY e.reviewed_at DESC`,
  );
}

export function saveExamples(batch: string, entries: object[], saved: boolean, actor: { scope: string; email: string }, visibility: "public" | "internal") {
  return queryScriptLab<{ script_id: string }>(
    `INSERT INTO script_lab.script_reviews (project_slug,batch_id,script_id,script_revision,decision,note,actor_scope,actor_email)
     SELECT p.slug,$1,e.script_id,e.script_revision,$3,e.note,$4,$5
     FROM script_lab.projects p CROSS JOIN jsonb_to_recordset($2::jsonb) e(script_id text,script_revision text,note text)
     WHERE p.slug='biceek' ${visibility === "public" ? "AND p.is_published" : ""} RETURNING script_id`,
    [batch, JSON.stringify(entries), saved ? "approved" : "rejected", actor.scope, actor.email],
  );
}

export async function loadExampleReferences(visibility: "public" | "internal") {
  const examples = await listExamples(visibility);
  if (!examples.length) return [];
  const stored = await queryScriptLab<{ batch_id: string; script: Record<string, unknown>; storyboard: Record<string, unknown> | null }>(
    `SELECT j.batch_id, script - 'compliance' AS script,
      (SELECT board->'storyboard' FROM jsonb_array_elements(coalesce(j.result->'storyboards','[]'::jsonb)) board
       WHERE board->>'script_id'=e.script_id AND board->>'script_revision'=script->>'revision' LIMIT 1) AS storyboard
     FROM jsonb_to_recordset($1::jsonb) e(batch_id text,script_id text)
     JOIN script_lab.video_jobs j ON j.batch_id::text=e.batch_id AND j.project_slug='biceek' AND j.status='completed'
     CROSS JOIN LATERAL jsonb_array_elements(coalesce(j.result->'scripts','[]'::jsonb)) script
     WHERE script->>'id'=e.script_id`,
    [JSON.stringify(examples)],
  );
  return [...stored, ...examples.flatMap(example => {
    if (example.batch_id !== sampleScriptBatch.id) return [];
    const script = sampleScriptBatch.scripts.find(item => item.id === example.script_id);
    return script ? [{ batch_id: example.batch_id, script, storyboard: sampleStoryboards.get(script.id) ?? null }] : [];
  })];
}
