-- ApnaPick: geographic areas (city / suburb / neighborhood polygons + centroids)
-- Hosted `db push` does not put schema `extensions` on search_path; PostGIS lives there.

set search_path = public, extensions;

create table public.geographic_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  area_type public.geographic_area_type not null,
  parent_id uuid references public.geographic_areas (id) on delete set null,
  country_code char(2) not null default 'IN',
  timezone text not null default 'Asia/Kolkata',
  geom extensions.geography(MultiPolygon, 4326) not null,
  centroid extensions.geography(Point, 4326) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint geographic_areas_slug_unique unique (slug),
  constraint geographic_areas_name_not_blank check (length(trim(name)) > 0)
);

create trigger geographic_areas_set_updated_at
  before update on public.geographic_areas
  for each row
  execute function public.set_updated_at();

create index geographic_areas_geom_gix
  on public.geographic_areas
  using gist (geom);

create index geographic_areas_centroid_gix
  on public.geographic_areas
  using gist (centroid);

create index geographic_areas_parent_id_idx
  on public.geographic_areas (parent_id);

create index geographic_areas_area_type_idx
  on public.geographic_areas (area_type);

create index geographic_areas_name_trgm_idx
  on public.geographic_areas
  using gin (name extensions.gin_trgm_ops);

-- Derive centroid from polygon on write
create or replace function public.geographic_areas_set_centroid()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.centroid := st_centroid(new.geom::geometry)::geography;
  return new;
end;
$$;

create trigger geographic_areas_set_centroid
  before insert or update of geom on public.geographic_areas
  for each row
  execute function public.geographic_areas_set_centroid();

comment on table public.geographic_areas is 'Market-agnostic city/suburb/neighborhood polygons for discovery and SEO.';
