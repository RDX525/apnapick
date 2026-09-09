-- Persist owner dashboard edits and send them to the admin review queue.
-- Published listings stay live; unpublished listings stay (or become) PENDING_REVIEW.

create or replace function public.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if p_value is null or p_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return p_value::uuid;
exception
  when others then
    return null;
end;
$$;

revoke all on function public.try_uuid(text) from public;

create or replace function public.apply_owner_listing_payload(
  p_business_id uuid,
  p_payload jsonb,
  p_replace boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_item jsonb;
  v_group jsonb;
  v_id uuid;
  v_keep uuid[] := '{}';
  v_closed boolean;
  v_opens time;
  v_closes time;
  v_day integer;
  v_category_id uuid;
  v_menu_id uuid;
  v_menu_category_id uuid;
  v_products jsonb := coalesce(p_payload -> 'products', '[]'::jsonb);
  v_services jsonb := coalesce(p_payload -> 'services', '[]'::jsonb);
  v_menu jsonb := coalesce(p_payload -> 'menu', '[]'::jsonb);
  v_name text;
  v_storage text;
  v_available boolean;
  v_price integer;
begin
  if jsonb_typeof(p_payload -> 'catalogItems') = 'array' then
    for v_item in select value from jsonb_array_elements(p_payload -> 'catalogItems')
    loop
      if v_item ->> 'kind' = 'service' then
        v_services := v_services || jsonb_build_array(v_item);
      else
        v_products := v_products || jsonb_build_array(v_item);
      end if;
    end loop;
  end if;

  if jsonb_typeof(p_payload -> 'menuCategories') = 'array'
     and jsonb_array_length(p_payload -> 'menuCategories') > 0 then
    v_menu := p_payload -> 'menuCategories';
  end if;

  update public.business_locations
  set
    address_line1 = coalesce(nullif(trim(p_payload ->> 'addressLine1'), ''), address_line1),
    suburb = coalesce(nullif(trim(p_payload ->> 'suburb'), ''), suburb),
    city = coalesce(nullif(trim(p_payload ->> 'city'), ''), city)
  where business_id = p_business_id
    and is_primary;

  if not found
     and nullif(trim(p_payload ->> 'addressLine1'), '') is not null
     and (p_payload ->> 'lat') is not null
     and (p_payload ->> 'lng') is not null then
    insert into public.business_locations (
      business_id, address_line1, suburb, city, postcode, country_code, geom, is_primary
    )
    values (
      p_business_id,
      trim(p_payload ->> 'addressLine1'),
      nullif(trim(p_payload ->> 'suburb'), ''),
      nullif(trim(p_payload ->> 'city'), ''),
      nullif(trim(p_payload ->> 'postcode'), ''),
      'IN',
      st_setsrid(
        st_makepoint((p_payload ->> 'lng')::double precision, (p_payload ->> 'lat')::double precision),
        4326
      )::geography,
      true
    );
  end if;

  select id into v_category_id
  from public.categories
  where slug = nullif(trim(p_payload ->> 'categorySlug'), '')
    and is_active;

  if v_category_id is not null then
    update public.business_categories
    set is_primary = false
    where business_id = p_business_id
      and is_primary
      and category_id is distinct from v_category_id;

    insert into public.business_categories (business_id, category_id, is_primary)
    values (p_business_id, v_category_id, true)
    on conflict (business_id, category_id) do update
    set is_primary = true;
  end if;

  if p_replace or (
    jsonb_typeof(p_payload -> 'hours') = 'array'
    and jsonb_array_length(p_payload -> 'hours') > 0
  ) then
    delete from public.business_hours where business_id = p_business_id;
    for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'hours', '[]'::jsonb))
    loop
      v_day := coalesce((v_item ->> 'dayOfWeek')::integer, -1);
      if v_day < 0 or v_day > 6 then
        continue;
      end if;
      v_closed := coalesce((v_item ->> 'isClosed')::boolean, true);
      v_opens := nullif(v_item ->> 'opensAt', '')::time;
      v_closes := nullif(v_item ->> 'closesAt', '')::time;
      if not v_closed and (v_opens is null or v_closes is null) then
        v_closed := true;
        v_opens := null;
        v_closes := null;
      end if;
      insert into public.business_hours (
        business_id, day_of_week, opens_at, closes_at, is_closed
      )
      values (p_business_id, v_day, v_opens, v_closes, v_closed)
      on conflict (business_id, day_of_week) do update
      set opens_at = excluded.opens_at,
          closes_at = excluded.closes_at,
          is_closed = excluded.is_closed;
    end loop;
  end if;

  if p_replace or jsonb_typeof(p_payload -> 'specialHours') = 'array' then
    delete from public.special_hours where business_id = p_business_id;
    for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'specialHours', '[]'::jsonb))
    loop
      if nullif(v_item ->> 'date', '') is null then
        continue;
      end if;
      v_closed := coalesce((v_item ->> 'isClosed')::boolean, true);
      v_opens := nullif(v_item ->> 'opensAt', '')::time;
      v_closes := nullif(v_item ->> 'closesAt', '')::time;
      if not v_closed and (v_opens is null or v_closes is null) then
        v_closed := true;
        v_opens := null;
        v_closes := null;
      end if;
      insert into public.special_hours (
        business_id, on_date, opens_at, closes_at, is_closed, note
      )
      values (
        p_business_id,
        (v_item ->> 'date')::date,
        v_opens,
        v_closes,
        v_closed,
        nullif(trim(coalesce(v_item ->> 'label', v_item ->> 'note')), '')
      )
      on conflict (business_id, on_date) do update
      set opens_at = excluded.opens_at,
          closes_at = excluded.closes_at,
          is_closed = excluded.is_closed,
          note = excluded.note;
    end loop;
  end if;

  v_keep := '{}';
  for v_item in select value from jsonb_array_elements(coalesce(v_products, '[]'::jsonb))
  loop
    v_name := nullif(trim(v_item ->> 'name'), '');
    if v_name is null then
      continue;
    end if;
    v_id := public.try_uuid(v_item ->> 'id');
    v_available := coalesce(
      (v_item ->> 'published')::boolean,
      (v_item ->> 'available')::boolean,
      true
    );
    v_price := nullif(v_item ->> 'priceCents', '')::integer;
    if v_id is not null and exists (
      select 1 from public.products where id = v_id and business_id = p_business_id
    ) then
      update public.products
      set name = v_name,
          description = nullif(trim(v_item ->> 'description'), ''),
          price_cents = v_price,
          is_available = v_available,
          sort_order = coalesce((v_item ->> 'sortOrder')::integer, 0),
          deleted_at = null
      where id = v_id;
    else
      if v_id is not null and exists (select 1 from public.products where id = v_id) then
        v_id := gen_random_uuid();
      end if;
      insert into public.products (
        id, business_id, name, description, price_cents, is_available, sort_order, deleted_at
      )
      values (
        coalesce(v_id, gen_random_uuid()),
        p_business_id,
        v_name,
        nullif(trim(v_item ->> 'description'), ''),
        v_price,
        v_available,
        coalesce((v_item ->> 'sortOrder')::integer, 0),
        null
      )
      returning id into v_id;
    end if;
    v_keep := array_append(v_keep, v_id);
  end loop;
  if p_replace then
    update public.products
    set deleted_at = timezone('utc', now())
    where business_id = p_business_id
      and deleted_at is null
      and (cardinality(v_keep) = 0 or not (id = any (v_keep)));
  end if;

  v_keep := '{}';
  for v_item in select value from jsonb_array_elements(coalesce(v_services, '[]'::jsonb))
  loop
    v_name := nullif(trim(v_item ->> 'name'), '');
    if v_name is null then
      continue;
    end if;
    v_id := public.try_uuid(v_item ->> 'id');
    v_available := coalesce(
      (v_item ->> 'published')::boolean,
      (v_item ->> 'available')::boolean,
      true
    );
    v_price := nullif(v_item ->> 'priceCents', '')::integer;
    if v_id is not null and exists (
      select 1 from public.services where id = v_id and business_id = p_business_id
    ) then
      update public.services
      set name = v_name,
          description = nullif(trim(v_item ->> 'description'), ''),
          price_cents = v_price,
          is_available = v_available,
          sort_order = coalesce((v_item ->> 'sortOrder')::integer, 0),
          deleted_at = null
      where id = v_id;
    else
      if v_id is not null and exists (select 1 from public.services where id = v_id) then
        v_id := gen_random_uuid();
      end if;
      insert into public.services (
        id, business_id, name, description, price_cents, is_available, sort_order, deleted_at
      )
      values (
        coalesce(v_id, gen_random_uuid()),
        p_business_id,
        v_name,
        nullif(trim(v_item ->> 'description'), ''),
        v_price,
        v_available,
        coalesce((v_item ->> 'sortOrder')::integer, 0),
        null
      )
      returning id into v_id;
    end if;
    v_keep := array_append(v_keep, v_id);
  end loop;
  if p_replace then
    update public.services
    set deleted_at = timezone('utc', now())
    where business_id = p_business_id
      and deleted_at is null
      and (cardinality(v_keep) = 0 or not (id = any (v_keep)));
  end if;

  if p_replace or jsonb_array_length(coalesce(v_menu, '[]'::jsonb)) > 0 then
    if p_replace then
      delete from public.menus where business_id = p_business_id;
    end if;
    if jsonb_array_length(coalesce(v_menu, '[]'::jsonb)) > 0 then
      insert into public.menus (business_id, name, is_active)
      values (p_business_id, 'Main menu', true)
      returning id into v_menu_id;
      for v_group in select value from jsonb_array_elements(v_menu)
      loop
        v_name := nullif(trim(v_group ->> 'name'), '');
        if v_name is null then
          continue;
        end if;
        insert into public.menu_categories (menu_id, name, sort_order)
        values (v_menu_id, v_name, coalesce((v_group ->> 'sortOrder')::integer, 0))
        returning id into v_menu_category_id;
        for v_item in select value from jsonb_array_elements(coalesce(v_group -> 'items', '[]'::jsonb))
        loop
          if nullif(trim(v_item ->> 'name'), '') is null then
            continue;
          end if;
          insert into public.menu_items (
            menu_category_id, name, description, price_cents, is_available, sort_order
          )
          values (
            v_menu_category_id,
            trim(v_item ->> 'name'),
            nullif(trim(v_item ->> 'description'), ''),
            nullif(v_item ->> 'priceCents', '')::integer,
            coalesce(
              (v_item ->> 'published')::boolean,
              (v_item ->> 'available')::boolean,
              true
            ),
            coalesce((v_item ->> 'sortOrder')::integer, 0)
          );
        end loop;
      end loop;
    end if;
  end if;

  v_keep := '{}';
  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'offers', '[]'::jsonb))
  loop
    v_name := nullif(trim(v_item ->> 'title'), '');
    if v_name is null then
      continue;
    end if;
    v_id := public.try_uuid(v_item ->> 'id');
    v_available := coalesce((v_item ->> 'active')::boolean, true);
    if v_id is not null and exists (
      select 1 from public.offers where id = v_id and business_id = p_business_id
    ) then
      update public.offers
      set title = v_name,
          description = nullif(trim(v_item ->> 'description'), ''),
          discount_label = nullif(trim(v_item ->> 'discountLabel'), ''),
          is_active = v_available,
          deleted_at = null
      where id = v_id;
    else
      if v_id is not null and exists (select 1 from public.offers where id = v_id) then
        v_id := gen_random_uuid();
      end if;
      insert into public.offers (
        id, business_id, title, description, discount_label, is_active, deleted_at
      )
      values (
        coalesce(v_id, gen_random_uuid()),
        p_business_id,
        v_name,
        nullif(trim(v_item ->> 'description'), ''),
        nullif(trim(v_item ->> 'discountLabel'), ''),
        v_available,
        null
      )
      returning id into v_id;
    end if;
    v_keep := array_append(v_keep, v_id);
  end loop;
  if p_replace and jsonb_typeof(p_payload -> 'offers') = 'array' then
    update public.offers
    set deleted_at = timezone('utc', now())
    where business_id = p_business_id
      and deleted_at is null
      and (cardinality(v_keep) = 0 or not (id = any (v_keep)));
  end if;

  v_keep := '{}';
  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'photos', '[]'::jsonb))
  loop
    v_id := public.try_uuid(v_item ->> 'id');
    v_storage := nullif(trim(coalesce(v_item ->> 'storagePath', v_item ->> 'previewUrl')), '');
    if v_id is not null and exists (
      select 1 from public.photos where id = v_id and business_id = p_business_id
    ) then
      update public.photos
      set alt_text = nullif(trim(v_item ->> 'name'), ''),
          sort_order = coalesce((v_item ->> 'sortOrder')::integer, 0),
          is_cover = coalesce((v_item ->> 'isCover')::boolean, v_item ->> 'role' = 'cover'),
          deleted_at = null
      where id = v_id;
      v_keep := array_append(v_keep, v_id);
    elsif v_storage is not null
      and v_storage not like 'blob:%'
      and v_storage not like 'data:%'
      and v_storage not like 'local/%' then
      insert into public.photos (
        business_id, storage_path, alt_text, sort_order, is_cover
      )
      values (
        p_business_id,
        v_storage,
        coalesce(nullif(trim(v_item ->> 'name'), ''), 'Photo'),
        coalesce((v_item ->> 'sortOrder')::integer, 0),
        coalesce((v_item ->> 'isCover')::boolean, v_item ->> 'role' = 'cover')
      )
      returning id into v_id;
      v_keep := array_append(v_keep, v_id);
    end if;
  end loop;
  if p_replace and jsonb_typeof(p_payload -> 'photos') = 'array' then
    update public.photos
    set deleted_at = timezone('utc', now())
    where business_id = p_business_id
      and deleted_at is null
      and (cardinality(v_keep) = 0 or not (id = any (v_keep)));
  end if;
end;
$$;

revoke all on function public.apply_owner_listing_payload(uuid, jsonb, boolean) from public;

create or replace function public.save_owner_workspace(
  p_business_id uuid,
  p_payload jsonb,
  p_completeness integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_old public.businesses%rowtype;
  v_status public.business_status;
  v_metadata jsonb;
  v_queued boolean := false;
  v_price smallint;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if nullif(trim(p_payload ->> 'name'), '') is null then
    raise exception 'Business name required' using errcode = '22023';
  end if;

  if not public.has_business_permission(p_business_id, 'manage_profile')
     and not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select * into v_old
  from public.businesses
  where id = p_business_id
    and deleted_at is null
  for update;

  if v_old.id is null then
    raise exception 'Business not found' using errcode = 'P0002';
  end if;

  v_status := v_old.status;
  v_metadata := coalesce(v_old.metadata, '{}'::jsonb);
  v_metadata := jsonb_set(
    v_metadata,
    '{temporarilyClosed}',
    to_jsonb(coalesce((p_payload ->> 'temporarilyClosed')::boolean, false))
  );

  if v_old.status in ('DRAFT', 'REJECTED') then
    v_status := 'PENDING_REVIEW';
    v_queued := true;
  elsif v_old.status = 'PENDING_REVIEW' then
    v_queued := true;
  elsif v_old.status = 'PUBLISHED' then
    v_queued := true;
    v_metadata := jsonb_set(v_metadata, '{ownerEditPending}', 'true'::jsonb);
    v_metadata := jsonb_set(
      v_metadata,
      '{ownerEditPendingAt}',
      to_jsonb(timezone('utc', now())::text)
    );
  end if;

  if p_payload ->> 'priceLevel' is null or p_payload ->> 'priceLevel' = '' then
    v_price := null;
  else
    v_price := greatest(1, least(4, (p_payload ->> 'priceLevel')::integer));
  end if;

  update public.businesses
  set
    name = trim(p_payload ->> 'name'),
    description = nullif(trim(p_payload ->> 'description'), ''),
    phone = nullif(trim(p_payload ->> 'phone'), ''),
    email = nullif(trim(p_payload ->> 'email'), ''),
    website = nullif(trim(p_payload ->> 'website'), ''),
    price_level = v_price,
    completeness = greatest(0, least(100, coalesce(p_completeness, 0))),
    status = v_status,
    metadata = v_metadata
  where id = p_business_id;

  perform public.apply_owner_listing_payload(p_business_id, p_payload, true);

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, old_data, new_data
  )
  values (
    v_user_id,
    'dashboard_workspace_saved',
    'business',
    p_business_id,
    jsonb_build_object('status', v_old.status, 'name', v_old.name),
    jsonb_build_object(
      'status', v_status,
      'queuedForReview', v_queued,
      'completeness', greatest(0, least(100, coalesce(p_completeness, 0)))
    )
  );

  return jsonb_build_object(
    'businessId', p_business_id,
    'status', v_status,
    'queuedForReview', v_queued,
    'completeness', greatest(0, least(100, coalesce(p_completeness, 0)))
  );
end;
$$;

revoke all on function public.save_owner_workspace(uuid, jsonb, integer) from public;
grant execute on function public.save_owner_workspace(uuid, jsonb, integer) to authenticated;

create or replace function public.admin_moderate_business(
  p_business_id uuid,
  p_action text,
  p_merge_into_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_old public.businesses%rowtype;
  v_status public.business_status;
  v_audit_id uuid;
  v_metadata jsonb;
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select * into v_old
  from public.businesses
  where id = p_business_id and deleted_at is null
  for update;

  if v_old.id is null then
    raise exception 'Business not found' using errcode = 'P0002';
  end if;

  case p_action
    when 'approve' then v_status := 'PUBLISHED';
    when 'verify' then v_status := 'PUBLISHED';
    when 'reject' then v_status := 'REJECTED';
    when 'suspend' then v_status := 'SUSPENDED';
    when 'merge_duplicate' then
      if p_merge_into_id is null or p_merge_into_id = p_business_id then
        raise exception 'A different merge target is required' using errcode = '22023';
      end if;
      perform 1 from public.businesses
      where id = p_merge_into_id and deleted_at is null and status = 'PUBLISHED';
      if not found then
        raise exception 'Published merge target not found' using errcode = '22023';
      end if;
      v_status := 'MERGED';
    when 'edit' then v_status := v_old.status;
    else raise exception 'Unsupported business action' using errcode = '22023';
  end case;

  v_metadata := coalesce(v_old.metadata, '{}'::jsonb);
  if p_action in ('approve', 'verify', 'edit') then
    v_metadata := v_metadata - 'ownerEditPending' - 'ownerEditPendingAt';
  end if;

  update public.businesses
  set
    status = v_status,
    published_at = case
      when v_status = 'PUBLISHED' then coalesce(published_at, timezone('utc', now()))
      else published_at
    end,
    is_claimed = case when p_action = 'verify' then true else is_claimed end,
    verified_at = case
      when p_action = 'verify' then coalesce(verified_at, timezone('utc', now()))
      else verified_at
    end,
    merged_into_id = case when p_action = 'merge_duplicate' then p_merge_into_id else merged_into_id end,
    metadata = v_metadata
  where id = p_business_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, old_data, new_data
  )
  values (
    v_actor,
    'business_' || p_action,
    'business',
    p_business_id,
    to_jsonb(v_old),
    jsonb_build_object('status', v_status, 'mergeIntoId', p_merge_into_id)
  )
  returning id into v_audit_id;

  return jsonb_build_object(
    'businessId', p_business_id,
    'status', v_status,
    'auditId', v_audit_id
  );
end;
$$;

create or replace function public.admin_moderate_claim(
  p_claim_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_claim public.business_claims%rowtype;
  v_status public.claim_status;
  v_audit_id uuid;
  v_draft jsonb;
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select * into v_claim
  from public.business_claims
  where id = p_claim_id
  for update;

  if v_claim.id is null then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;

  case p_action
    when 'approve' then v_status := 'VERIFIED';
    when 'verify' then v_status := 'VERIFIED';
    when 'reject' then v_status := 'REJECTED';
    when 'suspend' then v_status := 'REJECTED';
    when 'request_more_info' then v_status := 'UNDER_REVIEW';
    else raise exception 'Unsupported claim action' using errcode = '22023';
  end case;

  update public.business_claims
  set
    status = v_status,
    notes = coalesce(nullif(trim(p_note), ''), notes),
    reviewed_by = v_actor,
    reviewed_at = timezone('utc', now())
  where id = p_claim_id;

  if v_status = 'VERIFIED' then
    update public.businesses
    set
      is_claimed = true,
      verified_at = coalesce(verified_at, timezone('utc', now())),
      status = 'PUBLISHED',
      published_at = coalesce(published_at, timezone('utc', now()))
    where id = v_claim.business_id and deleted_at is null;

    insert into public.business_members (
      business_id, user_id, role, permissions, accepted_at
    )
    values (
      v_claim.business_id,
      v_claim.claimant_id,
      'OWNER',
      '{"manage_profile": true, "manage_team": true, "manage_billing": true}'::jsonb,
      timezone('utc', now())
    )
    on conflict (business_id, user_id) do update
    set role = 'OWNER', accepted_at = coalesce(public.business_members.accepted_at, excluded.accepted_at);

    insert into public.user_roles (user_id, role, granted_by)
    values (v_claim.claimant_id, 'BUSINESS_OWNER', v_actor)
    on conflict (user_id, role) do nothing;

    select payload
    into v_draft
    from public.onboarding_drafts
    where user_id = v_claim.claimant_id
      and business_id = v_claim.business_id
    order by updated_at desc
    limit 1;

    if v_draft is not null then
      update public.businesses
      set
        description = coalesce(nullif(trim(v_draft ->> 'description'), ''), description),
        phone = coalesce(nullif(trim(v_draft ->> 'phone'), ''), phone),
        email = coalesce(nullif(trim(v_draft ->> 'email'), ''), email),
        website = coalesce(nullif(trim(v_draft ->> 'website'), ''), website),
        metadata = jsonb_set(
          coalesce(metadata, '{}'::jsonb),
          '{temporarilyClosed}',
          to_jsonb(coalesce((v_draft ->> 'temporarilyClosed')::boolean, false))
        )
      where id = v_claim.business_id
        and deleted_at is null;

      perform public.apply_owner_listing_payload(v_claim.business_id, v_draft, false);
    end if;
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, old_data, new_data
  )
  values (
    v_actor,
    'claim_' || p_action,
    'business_claim',
    p_claim_id,
    to_jsonb(v_claim),
    jsonb_build_object('status', v_status, 'note', p_note)
  )
  returning id into v_audit_id;

  return jsonb_build_object(
    'claimId', p_claim_id,
    'businessId', v_claim.business_id,
    'status', v_status,
    'auditId', v_audit_id
  );
end;
$$;
