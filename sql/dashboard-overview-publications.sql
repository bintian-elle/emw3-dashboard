-- Apply explicitly to the existing AI insight database during authorized setup.
-- This migration does not alter or delete ai_insight_cache or any marketing table.
begin;
create table if not exists public.dashboard_overview_publications (
 project text primary key check (project in ('bluevua','biceek','ringconn')),
 range_start date not null,
 range_end date not null,
 payload jsonb not null,
 generated_at timestamptz not null,
 constraint dashboard_overview_week check (range_end-range_start=6 and extract(isodow from range_start)=2 and extract(isodow from range_end)=1),
 constraint dashboard_overview_payload check (jsonb_typeof(payload)='object' and payload ? 'report' and payload ? 'project' and payload->>'project'=project and payload->>'version'='1' and (payload->'range'->>'start')::date=range_start and (payload->'range'->>'end')::date=range_end)
);
-- Backend owner connections may read/write; no anon/authenticated browser policies are created.
alter table public.dashboard_overview_publications enable row level security;
comment on table public.dashboard_overview_publications is 'Latest validated Dashboard Builder overview per project; transactional upsert preserves the old row until success.';
commit;
