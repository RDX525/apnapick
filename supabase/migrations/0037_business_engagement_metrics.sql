-- Real dashboard engagement: profile views, website visits, leads from CTAs,
-- member-readable actions, and mark-as-read on leads.

-- ---------------------------------------------------------------------------
-- search_actions: allow profile "view"
-- ---------------------------------------------------------------------------

alter table public.search_actions
  drop constraint if exists search_actions_action_check;

alter table public.search_actions
  add constraint search_actions_action_check
  check (action in ('click', 'call', 'directions', 'website', 'save', 'share', 'view'));

-- ---------------------------------------------------------------------------
-- business_metrics_daily: website visits
-- ---------------------------------------------------------------------------

alter table public.business_metrics_daily
  add column if not exists website_visits integer not null default 0;

-- ---------------------------------------------------------------------------
-- leads: read_at for owner inbox
-- ---------------------------------------------------------------------------

alter table public.leads
  add column if not exists read_at timestamptz;

drop policy if exists leads_update_member on public.leads;
create policy leads_update_member
  on public.leads for update
  to authenticated
  using (public.is_business_member(business_id) or public.is_admin())
  with check (public.is_business_member(business_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- Members can read engagement for their businesses (dashboard live metrics)
-- ---------------------------------------------------------------------------

drop policy if exists search_actions_select_member on public.search_actions;
create policy search_actions_select_member
  on public.search_actions for select
  to authenticated
  using (
    business_id is not null
    and (
      public.is_business_member(business_id)
      or public.is_admin()
    )
  );

-- Owners need to count saves for their listing
drop policy if exists favorites_select_member on public.favorites;
create policy favorites_select_member
  on public.favorites for select
  to authenticated
  using (public.is_business_member(business_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- Atomic engagement recorder: action + lead + daily metric bump
-- ---------------------------------------------------------------------------

create or replace function public.record_business_engagement(
  p_business_id uuid,
  p_action text,
  p_search_event_id uuid default null,
  p_coarse_area_slug text default null,
  p_session_id text default null,
  p_query_normalized text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action_id uuid;
  v_today date := (timezone('utc', now()))::date;
  v_lead_type public.lead_type;
  v_message text;
begin
  if p_business_id is null then
    raise exception 'business_id required';
  end if;

  if p_action is null or p_action not in (
    'click', 'call', 'directions', 'website', 'save', 'share', 'view'
  ) then
    raise exception 'invalid action';
  end if;

  insert into public.search_actions (
    search_event_id,
    business_id,
    action,
    coarse_area_slug,
    session_id,
    query_normalized
  )
  values (
    p_search_event_id,
    p_business_id,
    p_action,
    left(p_coarse_area_slug, 80),
    left(p_session_id, 128),
    left(p_query_normalized, 200)
  )
  returning id into v_action_id;

  if p_search_event_id is not null and p_action = 'click' then
    perform public.append_search_event_selection(
      p_search_event_id,
      p_business_id
    );
  end if;

  -- Lead rows for high-intent CTAs
  if p_action = 'call' then
    v_lead_type := 'CALL';
    v_message := 'Called via ApnaPick';
  elsif p_action = 'directions' then
    v_lead_type := 'DIRECTIONS';
    v_message := 'Requested directions via ApnaPick';
  elsif p_action = 'website' then
    v_lead_type := 'WEBSITE';
    v_message := 'Visited website via ApnaPick';
  else
    v_lead_type := null;
  end if;

  if v_lead_type is not null then
    insert into public.leads (business_id, lead_type, message, metadata)
    values (
      p_business_id,
      v_lead_type,
      v_message,
      jsonb_build_object(
        'source', 'search_action',
        'action', p_action,
        'search_action_id', v_action_id
      )
    );
  end if;

  insert into public.business_metrics_daily as m (
    business_id,
    metric_date,
    views,
    search_impressions,
    clicks,
    calls,
    direction_intents,
    leads,
    favorites,
    website_visits
  )
  values (
    p_business_id,
    v_today,
    case when p_action = 'view' then 1 else 0 end,
    0,
    case when p_action = 'click' then 1 else 0 end,
    case when p_action = 'call' then 1 else 0 end,
    case when p_action = 'directions' then 1 else 0 end,
    case when p_action in ('call', 'directions', 'website') then 1 else 0 end,
    case when p_action = 'save' then 1 else 0 end,
    case when p_action = 'website' then 1 else 0 end
  )
  on conflict (business_id, metric_date) do update
    set views = m.views + excluded.views,
        clicks = m.clicks + excluded.clicks,
        calls = m.calls + excluded.calls,
        direction_intents = m.direction_intents + excluded.direction_intents,
        leads = m.leads + excluded.leads,
        favorites = m.favorites + excluded.favorites,
        website_visits = m.website_visits + excluded.website_visits,
        updated_at = timezone('utc', now());

  return v_action_id;
end;
$$;

revoke all on function public.record_business_engagement(
  uuid, text, uuid, text, text, text
) from public;

grant execute on function public.record_business_engagement(
  uuid, text, uuid, text, text, text
) to anon, authenticated, service_role;

comment on function public.record_business_engagement is
  'Records CTA engagement, creates leads for call/directions/website, bumps daily metrics.';

-- ---------------------------------------------------------------------------
-- Search result impressions (page of results)
-- ---------------------------------------------------------------------------

create or replace function public.bump_search_impressions(
  p_business_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_id uuid;
begin
  if p_business_ids is null or cardinality(p_business_ids) = 0 then
    return;
  end if;

  foreach v_id in array p_business_ids
  loop
    if v_id is null then
      continue;
    end if;

    insert into public.business_metrics_daily as m (
      business_id,
      metric_date,
      search_impressions
    )
    values (v_id, v_today, 1)
    on conflict (business_id, metric_date) do update
      set search_impressions = m.search_impressions + 1,
          updated_at = timezone('utc', now());
  end loop;
end;
$$;

revoke all on function public.bump_search_impressions(uuid[]) from public;

grant execute on function public.bump_search_impressions(uuid[])
  to anon, authenticated, service_role;

comment on function public.bump_search_impressions is
  'Increments search_impressions for businesses shown on a search results page.';
