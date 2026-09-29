create table if not exists public.ai_job_queue (
 id text primary key,
 request_id text not null unique,
 body jsonb not null,
 status text not null default 'queued' check(status in ('queued','running','completed','failed')),
 remote_id text,
 result jsonb,
 error text,
 finalized boolean not null default false,
 priority integer not null default 0,
 next_poll_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists ai_job_queue_pending on public.ai_job_queue(status,priority desc,created_at) where status in ('queued','running');
alter table public.ai_job_queue enable row level security;
revoke all on public.ai_job_queue from anon, authenticated;
