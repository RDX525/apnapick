-- Dashboard photo saves upsert covers in a loop. Clear live covers in the
-- same transaction so photos_one_cover_uidx cannot fire mid-apply when the
-- incoming cover is not the current cover row.
--
-- Published listings stay PUBLISHED. businesses_guard_trust_fields forbids
-- owners from unpublishing, so 0026's PENDING_REVIEW hop raises P0001.
-- Queue those edits with ownerEditPending instead (0023 behaviour).

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
    v_metadata := v_metadata - 'ownerEditPending' - 'ownerEditPendingAt';
  elsif v_old.status = 'PENDING_REVIEW' then
    v_queued := true;
    v_metadata := v_metadata - 'ownerEditPending' - 'ownerEditPendingAt';
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

  update public.photos
  set is_cover = false
  where business_id = p_business_id
    and is_cover
    and deleted_at is null;

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
