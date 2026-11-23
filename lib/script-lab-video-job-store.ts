import "server-only";

import { queryScriptLab } from "./script-lab-store";
import type { VideoBatch, VideoJob, VideoMode } from "./script-lab-video-jobs";

type Visibility = "public" | "internal";
type RequestPayload = { run_id: string; batch_id: string; mode: VideoMode; output_count: number };
const visible = (visibility: Visibility) => visibility === "public" ? "AND p.is_published" : "";
const columns = `j.id, j.batch_id, j.mode, j.status, j.stage, j.requested_name, j.submitted_at, j.started_at, j.finished_at,
  j.total, j.processed, j.error_code,
  coalesce((SELECT jsonb_agg(step.value ORDER BY step.ordinality) FROM (
    SELECT value, ordinality FROM jsonb_array_elements(j.events) WITH ORDINALITY ORDER BY ordinality DESC LIMIT 16
  ) step), '[]'::jsonb) AS recent_events,
  coalesce((SELECT jsonb_agg(issue ORDER BY issue.count DESC, issue.code) FROM (
    SELECT value->>'code' AS code, count(*)::int AS count
    FROM jsonb_array_elements(coalesce(j.result->'errors','[]'::jsonb))
    GROUP BY value->>'code'
  ) issue), '[]'::jsonb) AS issues,
  coalesce(jsonb_array_length(j.result->CASE WHEN j.mode='script' THEN 'scripts' ELSE 'storyboards' END), 0) AS generated_count, j.result->'scripts'->0->>'id' AS first_script_id, j.payload->>'source_batch_id' AS source_batch_id,
  coalesce(jsonb_path_query_array(j.result, '$.storyboards[*].script_id'), '[]'::jsonb) AS storyboard_script_ids,
  coalesce(j.payload->'combination', '["—","—"]'::jsonb) AS combination`;
const position = `CASE WHEN j.status='queued' THEN 1 + (
  SELECT count(*)::int FROM script_lab.video_jobs q WHERE q.project_slug=j.project_slug
  AND (q.status='running' OR (q.status='queued' AND (q.submitted_at,q.id) < (j.submitted_at,j.id)))
) ELSE 0 END AS queue_position`;

export async function enqueueVideoJob(payload: RequestPayload, actor: { email: string; name: string }, visibility: Visibility) {
  const [job] = await queryScriptLab<VideoJob>(
    `INSERT INTO script_lab.video_jobs AS j (id, project_slug, batch_id, mode, requested_by, requested_name, payload, total)
     SELECT $1::uuid, p.slug, $2::uuid, $3, $4, $5, $6::jsonb, $7::int
     FROM script_lab.projects p WHERE p.slug='biceek' ${visible(visibility)}
     RETURNING ${columns}, 0::int AS queue_position, true AS can_cancel`,
    [payload.run_id, payload.batch_id, payload.mode, actor.email, actor.name, JSON.stringify(payload), String(payload.output_count)],
  );
  return job;
}

export function listVideoJobs(visibility: Visibility, email?: string) {
  return queryScriptLab<VideoJob>(
    `SELECT ${columns}, ${position},
        (j.status IN ('queued','running') AND lower(j.requested_by)=lower($1)) AS can_cancel
      FROM script_lab.video_jobs j JOIN script_lab.projects p ON p.slug=j.project_slug
      WHERE p.slug='biceek' ${visible(visibility)}
      ORDER BY (j.status IN ('queued','running')) DESC, j.submitted_at DESC LIMIT 100`,
    [email ?? ""],
  );
}

export async function cancelVideoJob(jobId: string, email: string, visibility: Visibility) {
  const [job] = await queryScriptLab<VideoJob>(
    `UPDATE script_lab.video_jobs AS j
      SET status='cancelled', stage='cancelled', finished_at=now(),
          events=j.events || jsonb_build_array(jsonb_build_object('at',now(),'stage','cancelled','processed',j.processed))
      FROM script_lab.projects p
      WHERE p.slug='biceek' AND j.project_slug=p.slug ${visible(visibility)}
        AND j.id=$1::uuid AND lower(j.requested_by)=lower($2) AND j.status IN ('queued','running')
      RETURNING ${columns}, 0::int AS queue_position, false AS can_cancel`,
    [jobId, email],
  );
  return job;
}

export async function loadVideoBatch(batchId: string, visibility: Visibility) {
  const [batch] = await queryScriptLab<VideoBatch>(
    `SELECT ${columns}, ${position}, j.result->'scripts' AS scripts, CASE WHEN j.mode='script' THEN coalesce((
        SELECT jsonb_agg(selected.board) FROM (
          SELECT DISTINCT ON (entry.script_id) entry.board FROM (
            SELECT b->>'script_id' AS script_id,b AS board,j.finished_at AS finished, true AS integrated
            FROM jsonb_array_elements(coalesce(j.result->'storyboards','[]'::jsonb)) b
            UNION ALL
            SELECT b->>'script_id',b || jsonb_build_object('storage_batch_id',old.batch_id),old.finished_at,false
            FROM script_lab.video_jobs old
            CROSS JOIN LATERAL jsonb_array_elements(coalesce(old.result->'storyboards','[]'::jsonb)) b
            WHERE old.project_slug=j.project_slug AND old.mode='storyboard' AND old.status='completed'
              AND old.payload->>'source_batch_id'=j.batch_id::text
          ) entry
          WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(j.result->'scripts','[]'::jsonb)) script
            WHERE script->>'id'=entry.script_id AND script->>'revision'=entry.board->>'script_revision')
          ORDER BY entry.script_id,entry.integrated DESC,entry.finished DESC,entry.board->>'id'
        ) selected
      ),'[]'::jsonb) ELSE j.result->'storyboards' END AS storyboards
      FROM script_lab.video_jobs j JOIN script_lab.projects p ON p.slug=j.project_slug
      WHERE p.slug='biceek' ${visible(visibility)} AND j.batch_id=$1::uuid AND j.status='completed'`,
    [batchId],
  );
  return batch;
}

export async function loadVideoJob(jobId: string, visibility: Visibility) {
  const [job] = await queryScriptLab<VideoJob>(
    `SELECT ${columns}, ${position} FROM script_lab.video_jobs j JOIN script_lab.projects p ON p.slug=j.project_slug
      WHERE p.slug='biceek' ${visible(visibility)} AND j.id=$1::uuid`, [jobId],
  );
  return job;
}

export async function loadVideoSourcePayload(batchId: string, visibility: Visibility) {
  const [row] = await queryScriptLab<{ payload: Record<string, unknown> }>(
    `SELECT j.payload FROM script_lab.video_jobs j JOIN script_lab.projects p ON p.slug=j.project_slug
     WHERE p.slug='biceek' ${visible(visibility)} AND j.batch_id=$1::uuid AND j.mode='script' AND j.status='completed'`,
    [batchId],
  );
  return row?.payload;
}
