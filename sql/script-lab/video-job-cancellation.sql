\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '2s';
ALTER TABLE script_lab.video_jobs
  DROP CONSTRAINT video_jobs_status_check,
  ADD CONSTRAINT video_jobs_status_check
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')) NOT VALID;
COMMIT;

ALTER TABLE script_lab.video_jobs VALIDATE CONSTRAINT video_jobs_status_check;
