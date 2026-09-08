-- ApnaPick: geo + full-text search candidate retrieval with relevance scores
-- RankingService applies final weighted scoring; this returns retrieval candidates.

set search_path = public, extensions;

create or replace function public.search_business_candidates(
  p_query text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m double precision default 8000,
  p_category_slugs text[] default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  business_id uuid,
  name text,
  slug text,
  status public.business_status,
  primary_area_id uuid,
  avg_rating numeric,
  review_count integer,
  completeness smallint,
  is_claimed boolean,
  distance_m double precision,
  fts_rank real,
  trgm_sim real,
  item_match_score real,
  relevance real,
  matched_via text
)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_tsquery tsquery;
  v_q text := trim(coalesce(p_query, ''));
  v_has_geo boolean := (p_lat is not null and p_lng is not null);
  v_origin geography;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if v_has_geo then
    v_origin := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  end if;

  if v_q <> '' then
    v_tsquery := websearch_to_tsquery('public.english_unaccent', v_q);
  else
    v_tsquery := null;
  end if;

  return query
  with published as (
    select
      b.id,
      b.name,
      b.slug,
      b.status,
      b.primary_area_id,
      b.avg_rating,
      b.review_count,
      b.completeness,
      b.is_claimed,
      b.search_document,
      bl.geom as loc
    from public.businesses b
    left join lateral (
      select l.geom
      from public.business_locations l
      where l.business_id = b.id
      order by l.is_primary desc, l.created_at asc
      limit 1
    ) bl on true
    where b.status = 'PUBLISHED'
      and b.deleted_at is null
      and (
        p_category_slugs is null
        or cardinality(p_category_slugs) = 0
        or exists (
          select 1
          from public.business_categories bc
          join public.categories c on c.id = bc.category_id
          where bc.business_id = b.id
            and c.slug = any (p_category_slugs)
        )
      )
      and (
        not v_has_geo
        or bl.geom is null
        or st_dwithin(bl.geom, v_origin, p_radius_m)
      )
  ),
  product_hits as (
    select
      p.business_id,
      max(
        coalesce(ts_rank_cd(p.search_document, v_tsquery), 0)::real
        + similarity(p.name, v_q)::real
      ) as item_score
    from public.products p
    join published pub on pub.id = p.business_id
    where p.deleted_at is null
      and v_q <> ''
      and (
        (v_tsquery is not null and p.search_document @@ v_tsquery)
        or p.name % v_q
      )
    group by p.business_id
  ),
  service_hits as (
    select
      s.business_id,
      max(
        coalesce(ts_rank_cd(s.search_document, v_tsquery), 0)::real
        + similarity(s.name, v_q)::real
      ) as item_score
    from public.services s
    join published pub on pub.id = s.business_id
    where s.deleted_at is null
      and v_q <> ''
      and (
        (v_tsquery is not null and s.search_document @@ v_tsquery)
        or s.name % v_q
      )
    group by s.business_id
  ),
  scored as (
    select
      pub.id as business_id,
      pub.name,
      pub.slug,
      pub.status,
      pub.primary_area_id,
      pub.avg_rating,
      pub.review_count,
      pub.completeness,
      pub.is_claimed,
      case
        when v_has_geo and pub.loc is not null
          then st_distance(pub.loc, v_origin)::double precision
        else null::double precision
      end as distance_m,
      case
        when v_tsquery is not null
          then coalesce(ts_rank_cd(pub.search_document, v_tsquery), 0)::real
        else 0::real
      end as fts_rank,
      case
        when v_q <> '' then similarity(pub.name, v_q)::real
        else 0::real
      end as trgm_sim,
      greatest(
        coalesce(ph.item_score, 0),
        coalesce(sh.item_score, 0)
      )::real as item_match_score,
      (
        0.45 * case
          when v_tsquery is not null
            then coalesce(ts_rank_cd(pub.search_document, v_tsquery), 0)
          else 0
        end
        + 0.25 * case when v_q <> '' then similarity(pub.name, v_q) else 0 end
        + 0.20 * greatest(coalesce(ph.item_score, 0), coalesce(sh.item_score, 0))
        + 0.10 * case
          when v_has_geo and pub.loc is not null and p_radius_m > 0 then
            greatest(0, 1 - (st_distance(pub.loc, v_origin) / p_radius_m))
          else 0.5
        end
      )::real as relevance,
      case
        when v_q = '' then 'geo_or_browse'
        when v_tsquery is not null and pub.search_document @@ v_tsquery then 'fts'
        when v_q <> '' and pub.name % v_q then 'trgm'
        when ph.business_id is not null then 'product'
        when sh.business_id is not null then 'service'
        else 'filter'
      end as matched_via
    from published pub
    left join product_hits ph on ph.business_id = pub.id
    left join service_hits sh on sh.business_id = pub.id
    where
      v_q = ''
      or (v_tsquery is not null and pub.search_document @@ v_tsquery)
      or pub.name % v_q
      or ph.business_id is not null
      or sh.business_id is not null
  )
  select
    s.business_id,
    s.name,
    s.slug,
    s.status,
    s.primary_area_id,
    s.avg_rating,
    s.review_count,
    s.completeness,
    s.is_claimed,
    s.distance_m,
    s.fts_rank,
    s.trgm_sim,
    s.item_match_score,
    s.relevance,
    s.matched_via
  from scored s
  order by s.relevance desc nulls last, s.avg_rating desc, s.review_count desc, s.name asc
  limit v_limit
  offset v_offset;
end;
$$;

comment on function public.search_business_candidates is
  'Geo + FTS + trigram candidate retrieval for SearchRepository; final ranking is app-side.';

grant execute on function public.search_business_candidates(
  text, double precision, double precision, double precision, text[], integer, integer
) to anon, authenticated, service_role;

-- Open-now helper used by search filters
create or replace function public.business_is_open_now(
  p_business_id uuid,
  p_at timestamptz default timezone('utc', now()),
  p_tz text default 'Asia/Kolkata'
)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_local timestamp;
  v_dow smallint;
  v_time time;
  v_special record;
  v_hours record;
begin
  v_local := p_at at time zone p_tz;
  v_dow := extract(dow from v_local)::smallint;
  v_time := v_local::time;

  select *
  into v_special
  from public.special_hours sh
  where sh.business_id = p_business_id
    and sh.on_date = v_local::date
  limit 1;

  if found then
    if v_special.is_closed then
      return false;
    end if;
    return v_time >= v_special.opens_at and v_time < v_special.closes_at;
  end if;

  select *
  into v_hours
  from public.business_hours bh
  where bh.business_id = p_business_id
    and bh.day_of_week = v_dow
  limit 1;

  if not found then
    return false;
  end if;

  if v_hours.is_closed then
    return false;
  end if;

  -- Handles overnight windows (e.g. 22:00–02:00)
  if v_hours.closes_at <= v_hours.opens_at then
    return v_time >= v_hours.opens_at or v_time < v_hours.closes_at;
  end if;

  return v_time >= v_hours.opens_at and v_time < v_hours.closes_at;
end;
$$;

grant execute on function public.business_is_open_now(uuid, timestamptz, text)
  to anon, authenticated, service_role;
