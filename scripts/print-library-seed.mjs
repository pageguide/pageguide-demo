import { readFileSync } from 'node:fs';
const seed = JSON.parse(readFileSync(new URL('../lib/library-seed.json', import.meta.url), 'utf8'));
const sqlJson = JSON.stringify(seed).replaceAll("'", "''");
console.log(`-- Run after supabase/library.sql in the Supabase SQL Editor.
insert into public.pageguide_libraries (id, catalog, published)
values ('demo', '${sqlJson}'::jsonb, true)
on conflict (id) do update set catalog = excluded.catalog, published = true, updated_at = now();`);
