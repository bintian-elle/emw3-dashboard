-- Shared, explicitly refreshed channel data. A failed upstream refresh never updates this row.
create table if not exists public.testing_data_snapshots (
  channel text not null,
  scope_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (channel, scope_key)
);

alter table public.testing_data_snapshots enable row level security;
revoke all on public.testing_data_snapshots from anon, authenticated;
