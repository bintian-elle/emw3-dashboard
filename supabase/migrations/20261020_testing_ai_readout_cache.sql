create table if not exists public.testing_ai_readout_cache (
  cache_key text primary key,
  readout_type text not null check (readout_type in ('framework', 'period')),
  period_label text,
  period_start date,
  period_end date,
  comparison_label text,
  comparison_start date,
  comparison_end date,
  prompt_version text not null,
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testing_ai_readout_period_dates check (
    (readout_type = 'framework' and period_start is null and period_end is null)
    or (readout_type = 'period' and period_start is not null and period_end is not null)
  )
);

create index if not exists testing_ai_readout_period_lookup
  on public.testing_ai_readout_cache (readout_type, period_start, period_end, generated_at desc)
  where readout_type = 'period';

alter table public.testing_ai_readout_cache enable row level security;
revoke all on public.testing_ai_readout_cache from anon, authenticated;
