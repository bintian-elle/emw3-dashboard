-- Durable manual generation jobs; does not modify previous reports.
CREATE TABLE IF NOT EXISTS content_testing_reports.generation_requests (
 id uuid PRIMARY KEY,
 environment text NOT NULL CHECK (environment IN ('staging','production')),
 scope text NOT NULL,
 report_kind text NOT NULL CHECK (report_kind IN ('daily','weekly','monthly','custom')),
 period_start date NOT NULL,
 period_end date NOT NULL,
 comparison_start date NOT NULL,
 comparison_end date NOT NULL,
 author_sub text NOT NULL,
 status text NOT NULL CHECK (status IN ('queued','running','completed','failed')) DEFAULT 'queued',
 payload jsonb NOT NULL,
 error text,
 run_id text REFERENCES content_testing_reports.runs(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS content_testing_generation_active_scope_idx ON content_testing_reports.generation_requests (environment,scope,report_kind,period_start,period_end,comparison_start,comparison_end) WHERE status IN ('queued','running');
REVOKE ALL ON content_testing_reports.generation_requests FROM PUBLIC;
