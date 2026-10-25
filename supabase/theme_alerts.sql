create table if not exists public.theme_alerts (
  id uuid primary key default gen_random_uuid(),
  theme text not null check (char_length(theme) between 2 and 80),
  contact text not null check (char_length(contact) between 3 and 160),
  created_at timestamptz not null default now()
);

alter table public.theme_alerts enable row level security;

-- Inserts are made by the server with the service-role key. No public policies
-- are added, so browser clients cannot read or write contact records directly.
