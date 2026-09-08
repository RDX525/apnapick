-- ApnaPick: enhanced search candidates RPC + analytics actions
-- Extends FTS / pg_trgm / PostGIS retrieval with filters used by SearchRepository.

set search_path = public, extensions;

create or replace function public.increment_search_hit_count(p_search_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.searches
  set hit_count = hit_count + 1,
      last_seen_at = timezone('utc', now())
  where id = p_search_id;
$$;

grant execute on function public.increment_search_hit_count(uuid)
  to anon, authenticated, service_role;

-- Click / call / directions / etc. (coarse area only — no precise GPS)
create table public.search_actions (
  id uuid primary key default gen_random_uuid(),
  search_event_id uuid references public.search_events (id) on delete set null,
  business_id uuid references public.businesses (id) on delete set null,
  action text not null
    check (action in ('click', 'call', 'directions', 'website', 'save', 'share')),
  coarse_area_slug text,
  session_id text,
  query_normalized text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists search_actions_created_at_idx
  on public.search_actions (created_at desc);
create index if not exists search_actions_business_id_idx
  on public.search_actions (business_id);
create index if not exists search_actions_event_id_idx
  on public.search_actions (search_event_id);

alter table public.search_actions enable row level security;

drop policy if exists search_actions_insert on public.search_actions;
create policy search_actions_insert
  on public.search_actions for insert
  to anon, authenticated
  with check (true);

drop policy if exists search_actions_select_admin on public.search_actions;
create policy search_actions_select_admin
  on public.search_actions for select
  to authenticated
  using (public.is_admin());

comment on table public.search_actions is
  'Search engagement actions; stores coarse area only, never precise GPS.';

drop function if exists public.search_business_candidates(
  text, double precision, double precision, double precision, text[], integer, integer
);

create or replace function public.search_business_candidates(
  p_query text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_m double precision default 8000,
  p_category_slugs text[] default null,
  p_attribute_keys text[] default null,
  p_min_rating numeric default null,
  p_price_levels integer[] default null,
  p_open_now boolean default null,
  p_require_offers boolean default null,
  p_service_terms text[] default null,
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
  matched_via text,
  matched_item_name text,
  price_level smallint,
  suburb text,
  city text,
  open_now boolean,
  popularity_score real,
  freshness_score real,
  has_offer boolean
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
      b.price_level,
      b.search_document,
      b.updated_at,
      bl.geom as loc,
      bl.suburb,
      bl.city
    from public.businesses b
    left join lateral (
      select l.geom, l.suburb, l.city
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
        p_attribute_keys is null
        or cardinality(p_attribute_keys) = 0
        or (
          select count(distinct a.key)
          from public.business_attributes ba
          join public.attributes a on a.id = ba.attribute_id
          where ba.business_id = b.id
            and a.key = any (p_attribute_keys)
        ) = cardinality(p_attribute_keys)
      )
      and (p_min_rating is null or b.avg_rating >= p_min_rating)
      and (
        p_price_levels is null
        or cardinality(p_price_levels) = 0
        or b.price_level = any (p_price_levels)
      )
      and (
        p_open_now is distinct from true
        or public.business_is_open_now(b.id)
      )
      and (
        p_require_offers is distinct from true
        or exists (
          select 1
          from public.offers o
          where o.business_id = b.id
            and o.is_active
            and o.deleted_at is null
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
      ) as item_score,
      (array_agg(p.name order by
        coalesce(ts_rank_cd(p.search_document, v_tsquery), 0)
        + similarity(p.name, v_q) desc
      ))[1] as matched_name
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
      ) as item_score,
      (array_agg(s.name order by
        coalesce(ts_rank_cd(s.search_document, v_tsquery), 0)
        + similarity(s.name, v_q) desc
      ))[1] as matched_name
    from public.services s
    join published pub on pub.id = s.business_id
    where s.deleted_at is null
      and (
        (
          v_q <> ''
          and (
            (v_tsquery is not null and s.search_document @@ v_tsquery)
            or s.name % v_q
          )
        )
        or (
          p_service_terms is not null
          and cardinality(p_service_terms) > 0
          and exists (
            select 1
            from unnest(p_service_terms) t(term)
            where s.name ilike '%' || t.term || '%'
          )
        )
      )
    group by s.business_id
  ),
  offer_flags as (
    select o.business_id, true as has_offer
    from public.offers o
    join published pub on pub.id = o.business_id
    where o.is_active and o.deleted_at is null
    group by o.business_id
  ),
  popularity as (
    select
      m.business_id,
      least(
        1.0,
        ln(1 + sum(m.clicks + m.search_impressions + m.views)) / 8.0
      )::real as pop_score
    from public.business_metrics_daily m
    join published pub on pub.id = m.business_id
    where m.metric_date >= (current_date - 30)
    group by m.business_id
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
      end as matched_via,
      coalesce(ph.matched_name, sh.matched_name) as matched_item_name,
      pub.price_level,
      pub.suburb,
      pub.city,
      public.business_is_open_now(pub.id) as open_now,
      coalesce(pop.pop_score, 0)::real as popularity_score,
      least(
        1.0,
        greatest(
          0.2,
          1.0 - (extract(epoch from (now() - pub.updated_at)) / (86400.0 * 180.0))
        )
      )::real as freshness_score,
      coalesce(of.has_offer, false) as has_offer
    from published pub
    left join product_hits ph on ph.business_id = pub.id
    left join service_hits sh on sh.business_id = pub.id
    left join offer_flags of on of.business_id = pub.id
    left join popularity pop on pop.business_id = pub.id
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
    s.matched_via,
    s.matched_item_name,
    s.price_level,
    s.suburb,
    s.city,
    s.open_now,
    s.popularity_score,
    s.freshness_score,
    s.has_offer
  from scored s
  order by s.relevance desc nulls last, s.avg_rating desc, s.review_count desc, s.name asc
  limit v_limit
  offset v_offset;
end;
$$;

comment on function public.search_business_candidates is
  'Geo + FTS + trigram + filter candidate retrieval; RankingService applies final weights.';

grant execute on function public.search_business_candidates(
  text, double precision, double precision, double precision, text[], text[],
  numeric, integer[], boolean, boolean, text[], integer, integer
) to anon, authenticated, service_role;
