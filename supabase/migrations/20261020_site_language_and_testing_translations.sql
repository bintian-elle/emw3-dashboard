-- Same database as ai_insight_cache. All access is via authenticated server routes.
create table if not exists public.site_user_preferences (
  user_sub text primary key,
  language text not null default 'en' check (language in ('en','zh')),
  updated_at timestamptz not null default now()
);
create table if not exists public.testing_ai_readout_translations (
  cache_key text not null references public.testing_ai_readout_cache(cache_key) on delete cascade,
  language text not null check (language = 'zh'),
  source_hash text not null,
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (cache_key, language)
);
alter table public.site_user_preferences enable row level security;
alter table public.testing_ai_readout_translations enable row level security;
