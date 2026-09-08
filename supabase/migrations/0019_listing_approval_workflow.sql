-- Transactional listing submission and admin approval workflow.

create or replace function public.submit_business_listing(
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
  v_draft public.onboarding_drafts%rowtype;
  v_business_id uuid;
  v_category_id uuid;
  v_subcategory_id uuid;
  v_area_id uuid;
  v_slug text;
  v_item jsonb;
  v_group jsonb;
  v_menu_id uuid;
  v_menu_category_id uuid;
  v_photo jsonb;
  v_key text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if nullif(trim(p_payload ->> 'name'), '') is null then
    raise exception 'Business name required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select *
  into v_draft
  from public.onboarding_drafts
  where user_id = v_user_id and business_id is null
  for update;

  if v_draft.id is not null and (v_draft.payload ->> 'submittedBusinessId') is not null then
    select id, slug
    into v_business_id, v_slug
    from public.businesses
    where id = (v_draft.payload ->> 'submittedBusinessId')::uuid
      and created_by = v_user_id
      and deleted_at is null;

    if v_business_id is not null then
      return jsonb_build_object(
        'businessId', v_business_id,
        'slug', v_slug,
        'status', 'PENDING_REVIEW',
        'idempotent', true
      );
    end if;
  end if;

  select id into v_category_id
  from public.categories
  where slug = p_payload ->> 'categorySlug' and is_active;

  if v_category_id is null then
    raise exception 'Select a valid active category' using errcode = '22023';
  end if;

  if nullif(p_payload ->> 'subcategorySlug', '') is not null then
    select id into v_subcategory_id
    from public.subcategories
    where category_id = v_category_id
      and slug = p_payload ->> 'subcategorySlug'
      and is_active;
  end if;

  select id into v_area_id
  from public.geographic_areas
  where lower(name) in (
    lower(coalesce(p_payload ->> 'suburb', '')),
    lower(coalesce(p_payload ->> 'city', ''))
  )
  order by case when lower(name) = lower(p_payload ->> 'suburb') then 0 else 1 end
  limit 1;

  v_business_id := gen_random_uuid();
  v_slug :=
    trim(both '-' from regexp_replace(
      lower(public.immutable_unaccent(p_payload ->> 'name')),
      '[^a-z0-9]+',
      '-',
      'g'
    )) || '-' || left(v_business_id::text, 8);

  insert into public.businesses (
    id, name, slug, description, status, primary_area_id, phone, email, website,
    price_level, completeness, created_by, metadata
  )
  values (
    v_business_id,
    trim(p_payload ->> 'name'),
    v_slug,
    nullif(trim(p_payload ->> 'description'), ''),
    'PENDING_REVIEW',
    v_area_id,
    nullif(trim(p_payload ->> 'phone'), ''),
    nullif(trim(p_payload ->> 'email'), ''),
    nullif(trim(p_payload ->> 'website'), ''),
    greatest(1, least(4, coalesce((p_payload ->> 'priceLevel')::integer, 2))),
    greatest(0, least(100, p_completeness)),
    v_user_id,
    jsonb_build_object(
      'bookingUrl', p_payload ->> 'bookingUrl',
      'orderUrl', p_payload ->> 'orderUrl',
      'social', coalesce(p_payload -> 'social', '{}'::jsonb),
      'temporarilyClosed', coalesce((p_payload ->> 'temporarilyClosed')::boolean, false)
    )
  );

  insert into public.business_members (
    business_id, user_id, role, permissions, accepted_at
  )
  values (
    v_business_id,
    v_user_id,
    'OWNER',
    '{"manage_profile": true, "manage_team": true, "manage_billing": true}'::jsonb,
    timezone('utc', now())
  );

  insert into public.user_roles (user_id, role, granted_by)
  values (v_user_id, 'BUSINESS_OWNER', v_user_id)
  on conflict (user_id, role) do nothing;

  insert into public.business_categories (
    business_id, category_id, subcategory_id, is_primary
  )
  values (v_business_id, v_category_id, v_subcategory_id, true);

  if nullif(trim(p_payload ->> 'addressLine1'), '') is not null
     and (p_payload ->> 'lat') is not null
     and (p_payload ->> 'lng') is not null then
    insert into public.business_locations (
      business_id, address_line1, suburb, city, postcode, country_code, geom, is_primary
    )
    values (
      v_business_id,
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

  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'hours', '[]'::jsonb))
  loop
    insert into public.business_hours (
      business_id, day_of_week, opens_at, closes_at, is_closed
    )
    values (
      v_business_id,
      (v_item ->> 'dayOfWeek')::smallint,
      nullif(v_item ->> 'opensAt', '')::time,
      nullif(v_item ->> 'closesAt', '')::time,
      coalesce((v_item ->> 'isClosed')::boolean, true)
    );
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'specialHours', '[]'::jsonb))
  loop
    insert into public.special_hours (
      business_id, on_date, opens_at, closes_at, is_closed, note
    )
    values (
      v_business_id,
      (v_item ->> 'date')::date,
      nullif(v_item ->> 'opensAt', '')::time,
      nullif(v_item ->> 'closesAt', '')::time,
      coalesce((v_item ->> 'isClosed')::boolean, true),
      nullif(trim(v_item ->> 'label'), '')
    );
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'catalogItems', '[]'::jsonb))
  loop
    if v_item ->> 'kind' = 'service' then
      insert into public.services (
        business_id, name, description, price_cents, is_available
      )
      values (
        v_business_id,
        trim(v_item ->> 'name'),
        nullif(trim(v_item ->> 'description'), ''),
        nullif(v_item ->> 'priceCents', '')::integer,
        coalesce((v_item ->> 'available')::boolean, true)
      );
    else
      insert into public.products (
        business_id, name, description, price_cents, is_available,
        metadata
      )
      values (
        v_business_id,
        trim(v_item ->> 'name'),
        nullif(trim(v_item ->> 'description'), ''),
        nullif(v_item ->> 'priceCents', '')::integer,
        coalesce((v_item ->> 'available')::boolean, true),
        jsonb_build_object('kind', coalesce(v_item ->> 'kind', 'product'))
      );
    end if;
  end loop;

  for v_key in
    select value #>> '{}'
    from jsonb_array_elements(coalesce(p_payload -> 'attributes', '[]'::jsonb))
  loop
    insert into public.business_attributes (business_id, attribute_id, value)
    select v_business_id, id, 'true'
    from public.attributes
    where key = v_key
    on conflict (business_id, attribute_id) do nothing;
  end loop;

  for v_key in
    select value #>> '{}'
    from jsonb_array_elements(coalesce(p_payload -> 'tags', '[]'::jsonb))
  loop
    insert into public.business_tags (business_id, tag_id)
    select v_business_id, id
    from public.tags
    where slug = v_key
    on conflict (business_id, tag_id) do nothing;
  end loop;

  if jsonb_array_length(coalesce(p_payload -> 'menuCategories', '[]'::jsonb)) > 0 then
    insert into public.menus (business_id, name, is_active)
    values (v_business_id, 'Main menu', true)
    returning id into v_menu_id;

    for v_group in select value from jsonb_array_elements(p_payload -> 'menuCategories')
    loop
      insert into public.menu_categories (menu_id, name, sort_order)
      values (v_menu_id, trim(v_group ->> 'name'), 0)
      returning id into v_menu_category_id;

      for v_item in select value from jsonb_array_elements(coalesce(v_group -> 'items', '[]'::jsonb))
      loop
        insert into public.menu_items (
          menu_category_id, name, description, price_cents, is_available
        )
        values (
          v_menu_category_id,
          trim(v_item ->> 'name'),
          nullif(trim(v_item ->> 'description'), ''),
          nullif(v_item ->> 'priceCents', '')::integer,
          coalesce((v_item ->> 'available')::boolean, true)
        );
      end loop;
    end loop;
  end if;

  for v_photo in select value from jsonb_array_elements(coalesce(p_payload -> 'photos', '[]'::jsonb))
  loop
    if nullif(v_photo ->> 'storagePath', '') is not null then
      insert into public.photos (
        business_id, storage_path, alt_text, is_cover
      )
      values (
        v_business_id,
        v_photo ->> 'storagePath',
        trim(p_payload ->> 'name') || ' ' || coalesce(v_photo ->> 'role', 'photo'),
        v_photo ->> 'role' = 'cover'
      );
    end if;
  end loop;

  if v_draft.id is null then
    insert into public.onboarding_drafts (
      user_id, business_id, current_step, payload
    )
    values (
      v_user_id,
      null,
      '8',
      jsonb_set(p_payload, '{submittedBusinessId}', to_jsonb(v_business_id::text), true)
    );
  else
    update public.onboarding_drafts
    set
      current_step = '8',
      payload = jsonb_set(p_payload, '{submittedBusinessId}', to_jsonb(v_business_id::text), true)
    where id = v_draft.id;
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, new_data
  )
  values (
    v_user_id,
    'onboarding_submitted',
    'business',
    v_business_id,
    jsonb_build_object('completeness', p_completeness, 'status', 'PENDING_REVIEW')
  );

  return jsonb_build_object(
    'businessId', v_business_id,
    'slug', v_slug,
    'status', 'PENDING_REVIEW',
    'idempotent', false
  );
end;
$$;

revoke all on function public.submit_business_listing(jsonb, integer) from public;
grant execute on function public.submit_business_listing(jsonb, integer) to authenticated;

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
    merged_into_id = case when p_action = 'merge_duplicate' then p_merge_into_id else merged_into_id end
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

revoke all on function public.admin_moderate_business(uuid, text, uuid) from public;
grant execute on function public.admin_moderate_business(uuid, text, uuid) to authenticated;

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

revoke all on function public.admin_moderate_claim(uuid, text, text) from public;
grant execute on function public.admin_moderate_claim(uuid, text, text) to authenticated;
