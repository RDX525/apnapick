-- Owner listing production: photo storage, Open now respects temporary closure,
-- persist uploaded photo IDs, and update location pins on save.

insert into storage.buckets (id, name, public)
values ('business-photos', 'business-photos', true)
on conflict (id) do update
set public = true;

drop policy if exists business_photos_public_read on storage.objects;
create policy business_photos_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'business-photos');

drop policy if exists business_photos_member_insert on storage.objects;
create policy business_photos_member_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'business-photos'
    and (
      public.has_business_permission(
        public.try_uuid(split_part(name, '/', 1)),
        'manage_profile'
      )
      or public.is_admin()
    )
  );

drop policy if exists business_photos_member_update on storage.objects;
create policy business_photos_member_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'business-photos'
    and (
      public.has_business_permission(
        public.try_uuid(split_part(name, '/', 1)),
        'manage_profile'
      )
      or public.is_admin()
    )
  )
  with check (
    bucket_id = 'business-photos'
    and (
      public.has_business_permission(
        public.try_uuid(split_part(name, '/', 1)),
        'manage_profile'
      )
      or public.is_admin()
    )
  );

drop policy if exists business_photos_member_delete on storage.objects;
create policy business_photos_member_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'business-photos'
    and (
      public.has_business_permission(
        public.try_uuid(split_part(name, '/', 1)),
        'manage_profile'
      )
      or public.is_admin()
    )
  );

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
  if exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.deleted_at is null
      and coalesce((b.metadata ->> 'temporarilyClosed')::boolean, false)
  ) then
    return false;
  end if;

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

  if v_hours.closes_at <= v_hours.opens_at then
    return v_time >= v_hours.opens_at or v_time < v_hours.closes_at;
  end if;

  return v_time >= v_hours.opens_at and v_time < v_hours.closes_at;
end;
$$;

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
  v_unusable boolean := false;
  v_has_pin boolean;
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

  v_has_pin :=
    nullif(p_payload ->> 'lat', '') is not null
    and nullif(p_payload ->> 'lng', '') is not null;

  update public.business_locations
  set
    address_line1 = coalesce(nullif(trim(p_payload ->> 'addressLine1'), ''), address_line1),
    suburb = coalesce(nullif(trim(p_payload ->> 'suburb'), ''), suburb),
    city = coalesce(nullif(trim(p_payload ->> 'city'), ''), city),
    geom = case
      when v_has_pin then
        st_setsrid(
          st_makepoint(
            (p_payload ->> 'lng')::double precision,
            (p_payload ->> 'lat')::double precision
          ),
          4326
        )::geography
      else geom
    end
  where business_id = p_business_id
    and is_primary;

  if not found
     and nullif(trim(p_payload ->> 'addressLine1'), '') is not null
     and v_has_pin then
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
        st_makepoint(
          (p_payload ->> 'lng')::double precision,
          (p_payload ->> 'lat')::double precision
        ),
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
  v_unusable := false;
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
          storage_path = case
            when v_storage is not null
              and v_storage not like 'blob:%'
              and v_storage not like 'data:%'
              and v_storage not like 'local/%'
            then v_storage
            else storage_path
          end,
          deleted_at = null
      where id = v_id;
      v_keep := array_append(v_keep, v_id);
    elsif v_storage is not null
      and v_storage not like 'blob:%'
      and v_storage not like 'data:%'
      and v_storage not like 'local/%' then
      if v_id is not null and exists (select 1 from public.photos where id = v_id) then
        v_id := gen_random_uuid();
      end if;
      insert into public.photos (
        id, business_id, storage_path, alt_text, sort_order, is_cover
      )
      values (
        coalesce(v_id, gen_random_uuid()),
        p_business_id,
        v_storage,
        coalesce(nullif(trim(v_item ->> 'name'), ''), 'Photo'),
        coalesce((v_item ->> 'sortOrder')::integer, 0),
        coalesce((v_item ->> 'isCover')::boolean, v_item ->> 'role' = 'cover')
      )
      returning id into v_id;
      v_keep := array_append(v_keep, v_id);
    else
      v_unusable := true;
    end if;
  end loop;
  if p_replace and jsonb_typeof(p_payload -> 'photos') = 'array' then
    if not (cardinality(v_keep) = 0 and v_unusable) then
      update public.photos
      set deleted_at = timezone('utc', now())
      where business_id = p_business_id
        and deleted_at is null
        and (cardinality(v_keep) = 0 or not (id = any (v_keep)));
    end if;
  end if;
end;
$$;

revoke all on function public.apply_owner_listing_payload(uuid, jsonb, boolean) from public;
