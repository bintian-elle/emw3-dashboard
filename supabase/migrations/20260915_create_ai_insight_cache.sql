create table if not exists public.ai_insight_cache (
  cache_key text primary key,
  preset text not null check (preset in ('last_30_days', 'last_week')),
  range_start date not null,
  range_end date not null,
  comparison_start date not null,
  comparison_end date not null,
  payload jsonb not null,
  model text not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists ai_insight_cache_expiry_idx
  on public.ai_insight_cache (preset, expires_at);

comment on table public.ai_insight_cache is
  'Server-generated, read-only-for-the-LLM EDM insight cache.';
