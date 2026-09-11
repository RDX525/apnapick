-- Accept owner edits must publish listings waiting for review.
-- Hide-until-approval (0026) sets PENDING_REVIEW and clears ownerEditPending,
-- so keeping the old status left those listings hidden.

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
    when 'edit' then
      v_status := case
        when v_old.status = 'PENDING_REVIEW' then 'PUBLISHED'::public.business_status
        else v_old.status
      end;
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
