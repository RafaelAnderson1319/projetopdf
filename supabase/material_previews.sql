-- The app keeps its original PDF files on the private server. Only low-res,
-- watermarked WebP previews are uploaded to this public bucket.
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('pdf-previews', 'pdf-previews', true, array['image/webp'])
on conflict (id) do update set public = true, allowed_mime_types = excluded.allowed_mime_types;

-- Create the app's matching catalog table when a project does not have one yet.
create table if not exists public.materials (
  id uuid primary key,
  title text not null,
  level text not null,
  subject text not null,
  grade text not null default '',
  description text not null default '',
  price integer not null default 0 check (price >= 0), -- centavos
  created_at timestamptz not null default now(),
  active boolean not null default true
);

alter table public.materials add column if not exists preview_urls text[] not null default '{}';
alter table public.materials add column if not exists page_count integer not null default 0 check (page_count >= 0);
alter table public.materials enable row level security;

-- No public write/read policies: uploads and catalog sync use the server-only service role.
