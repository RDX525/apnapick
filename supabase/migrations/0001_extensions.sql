-- ApnaPick: required PostgreSQL extensions
-- PostGIS for geography, pg_trgm for fuzzy match, unaccent for FTS, citext for case-insensitive emails/slugs helpers

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext with schema extensions;

-- Hosted projects do not include `extensions` on the default search_path.
set search_path = public, extensions;

-- Immutable unaccent wrapper (required for generated columns / indexes)
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select extensions.unaccent('extensions.unaccent', $1);
$$;

-- FTS config: unaccent + english stemming
do $$
begin
  if not exists (
    select 1 from pg_ts_config where cfgname = 'english_unaccent'
  ) then
    create text search configuration public.english_unaccent (copy = english);
    alter text search configuration public.english_unaccent
      alter mapping for hword, hword_part, word
      with extensions.unaccent, english_stem;
  end if;
end
$$;
