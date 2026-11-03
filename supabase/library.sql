-- Run in the Supabase SQL Editor. All data here is intentionally public demo content.
-- Never store user sessions, carts, credentials, or private pages in this table.
create table if not exists public.pageguide_libraries (
  id text primary key,
  catalog jsonb not null,
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.pageguide_libraries enable row level security;
revoke all on public.pageguide_libraries from anon, authenticated;
grant select on public.pageguide_libraries to anon, authenticated;
drop policy if exists "Read published demo catalog" on public.pageguide_libraries;
create policy "Read published demo catalog"
  on public.pageguide_libraries for select to anon, authenticated
  using (published = true and id = 'demo');
-- No insert/update/delete policies: publishable keys cannot edit demo content.
-- Generate the separate INSERT statement with: node scripts/print-library-seed.mjs
