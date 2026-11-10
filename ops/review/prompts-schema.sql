CREATE TABLE IF NOT EXISTS public.staging_testing_prompt_sources (
 prompt_id text NOT NULL,id text NOT NULL,content text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(prompt_id,id)
);
ALTER TABLE public.staging_testing_prompt_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staging_testing_prompt_sources FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS public.staging_testing_prompt_versions (
 id text PRIMARY KEY, prompt_id text NOT NULL, revision integer NOT NULL CHECK(revision>0), parent_id text NOT NULL,
 content text NOT NULL CHECK(length(content)<=150000), previous_content text NOT NULL,
 note text NOT NULL CHECK(length(note) BETWEEN 1 AND 400), author jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(prompt_id,revision)
);
CREATE TABLE IF NOT EXISTS public.staging_testing_prompt_runs (
 id uuid PRIMARY KEY, mode text NOT NULL CHECK(mode IN ('analysis','readability')), campaign text NOT NULL,
 period jsonb NOT NULL, language text NOT NULL CHECK(language IN ('en','zh')), versions jsonb NOT NULL,
 frozen_input jsonb NOT NULL, input_hash text NOT NULL, baseline_id uuid REFERENCES public.staging_testing_prompt_runs(id),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed')), stage text NOT NULL DEFAULT 'queued',
 author jsonb NOT NULL, result jsonb, error text, native_thread text, native_turn text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),heartbeat_at timestamptz
);
CREATE INDEX IF NOT EXISTS staging_testing_prompt_runs_queue ON public.staging_testing_prompt_runs(created_at) WHERE status IN ('queued','running');
ALTER TABLE public.staging_testing_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_testing_prompt_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staging_testing_prompt_versions,public.staging_testing_prompt_runs FROM PUBLIC,anon,authenticated;
