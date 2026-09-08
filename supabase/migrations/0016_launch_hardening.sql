-- Launch hardening: webhook apply status (no silent lost updates), analytics abuse limits

-- ---------------------------------------------------------------------------
-- subscription_events: distinguish "seen" from "successfully applied".
--
-- Previously the ledger row was inserted before the state change was applied.
-- A transient failure mid-apply left the row behind, so Stripe's retry hit the
-- duplicate branch and the subscription update was permanently lost.
-- ---------------------------------------------------------------------------

alter table public.subscription_events
  add column if not exists apply_status text not null default 'pending'
    check (apply_status in ('pending', 'applied', 'failed', 'ignored')),
  add column if not exists apply_error text,
  add column if not exists attempts integer not null default 0
    check (attempts >= 0),
  add column if not exists applied_at timestamptz;

-- Existing rows predate the column; treat them as applied so we do not replay.
update public.subscription_events
set apply_status = 'applied',
    applied_at = coalesce(applied_at, processed_at)
where apply_status = 'pending';

create index if not exists subscription_events_apply_status_idx
  on public.subscription_events (apply_status)
  where apply_status in ('pending', 'failed');

comment on column public.subscription_events.apply_status is
  'pending = received but not applied; applied = state committed; failed = retryable.';

-- ---------------------------------------------------------------------------
-- Analytics write abuse: cap anonymous inserts to plausible shapes
-- ---------------------------------------------------------------------------

-- 0015 removed the open UPDATE policy on `searches`, which the client-side
-- upsert relied on for its ON CONFLICT branch. Replace that read-modify-write
-- with one atomic security-definer RPC: no open UPDATE grant, no double count.

drop policy if exists searches_insert on public.searches;

create policy searches_insert
  on public.searches for insert
  to anon, authenticated
  with check (
    length(normalized_query) between 1 and 200
    and coalesce(array_length(category_slugs, 1), 0) <= 20
    and coalesce(array_length(item_terms, 1), 0) <= 20
    and coalesce(array_length(service_terms, 1), 0) <= 20
  );

drop policy if exists search_actions_insert on public.search_actions;

create policy search_actions_insert
  on public.search_actions for insert
  to anon, authenticated
  with check (
    coalesce(length(query_normalized), 0) <= 200
    and coalesce(length(coarse_area_slug), 0) <= 80
    and coalesce(length(session_id), 0) <= 128
  );

create or replace function public.record_search_event(
  p_normalized_query text,
  p_query_hash text,
  p_intent text default null,
  p_category_slugs text[] default '{}',
  p_item_terms text[] default '{}',
  p_service_terms text[] default '{}',
  p_session_id text default null,
  p_raw_query text default null,
  p_parsed jsonb default '{}'::jsonb,
  p_result_count integer default 0,
  p_coarse_area_slug text default null,
  p_radius_m double precision default null,
  p_latency_ms integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_search_id uuid;
  v_event_id uuid;
begin
  if p_normalized_query is null or length(trim(p_normalized_query)) = 0 then
    return null;
  end if;

  if length(p_normalized_query) > 200 then
    raise exception 'normalized_query too long';
  end if;

  -- Atomic upsert + counter increment (no lost updates under concurrency)
  insert into public.searches as s (
    normalized_query,
    query_hash,
    intent,
    category_slugs,
    item_terms,
    service_terms,
    hit_count,
    last_seen_at
  )
  values (
    p_normalized_query,
    p_query_hash,
    p_intent,
    coalesce(p_category_slugs, '{}'),
    coalesce(p_item_terms, '{}'),
    coalesce(p_service_terms, '{}'),
    1,
    timezone('utc', now())
  )
  on conflict (query_hash) do update
    set hit_count = s.hit_count + 1,
        last_seen_at = timezone('utc', now()),
        intent = coalesce(excluded.intent, s.intent)
  returning s.id into v_search_id;

  insert into public.search_events (
    search_id,
    session_id,
    raw_query,
    normalized_query,
    parsed,
    result_count,
    coarse_area_slug,
    radius_m,
    latency_ms
  )
  values (
    v_search_id,
    left(p_session_id, 128),
    left(coalesce(p_raw_query, p_normalized_query), 400),
    p_normalized_query,
    coalesce(p_parsed, '{}'::jsonb),
    greatest(0, coalesce(p_result_count, 0)),
    left(p_coarse_area_slug, 80),
    p_radius_m,
    p_latency_ms
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.record_search_event(
  text, text, text, text[], text[], text[], text, text, jsonb,
  integer, text, double precision, integer
) from public;

grant execute on function public.record_search_event(
  text, text, text, text[], text[], text[], text, text, jsonb,
  integer, text, double precision, integer
) to anon, authenticated, service_role;

comment on function public.record_search_event is
  'Atomic search analytics write. Replaces client upsert + separate counter RPC.';

-- Click attribution was a read-then-write on selected_business_ids, so
-- concurrent clicks on the same search event silently dropped entries.
create or replace function public.append_search_event_selection(
  p_event_id uuid,
  p_business_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.search_events
  set selected_business_ids = array_append(selected_business_ids, p_business_id)
  where id = p_event_id
    and p_business_id is not null
    and not (selected_business_ids @> array[p_business_id]::uuid[])
    and coalesce(array_length(selected_business_ids, 1), 0) < 100;
$$;

revoke all on function public.append_search_event_selection(uuid, uuid) from public;
grant execute on function public.append_search_event_selection(uuid, uuid)
  to anon, authenticated, service_role;
