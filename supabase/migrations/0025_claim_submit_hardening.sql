-- Make ownership-claim submission durable: keep the wizard payload, don’t
-- abort if audit/verification inserts fail, and let admin approve read evidence.

create or replace function public.submit_business_claim(
  p_business_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_claim_id uuid;
  v_status public.claim_status;
  v_draft_id uuid;
  v_evidence jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.profiles (id, display_name)
  values (v_user_id, null)
  on conflict (id) do nothing;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text || ':' || v_user_id::text, 0)
  );

  select id, status
  into v_claim_id, v_status
  from public.business_claims
  where business_id = p_business_id
    and claimant_id = v_user_id
    and status in ('PENDING', 'UNDER_REVIEW')
  limit 1
  for update;

  if v_claim_id is not null then
    v_evidence := jsonb_build_object(
      'source', 'onboarding_wizard',
      'note', concat('Ownership claim for ', coalesce(p_payload ->> 'name', 'listing')),
      'payload', coalesce(p_payload, '{}'::jsonb)
    );
    update public.business_claims
    set
      evidence = v_evidence,
      notes = concat('Submitted from listing wizard for ', coalesce(p_payload ->> 'name', 'listing'))
    where id = v_claim_id;
  elsif exists (
    select 1
    from public.business_members
    where business_id = p_business_id and user_id = v_user_id
  ) then
    return jsonb_build_object(
      'claimId', null,
      'businessId', p_business_id,
      'status', 'VERIFIED',
      'alreadyMember', true
    );
  else
    perform 1
    from public.businesses
    where id = p_business_id
      and status = 'PUBLISHED'
      and not is_claimed
      and deleted_at is null;

    if not found then
      raise exception 'This business is not available to claim' using errcode = '22023';
    end if;

    v_evidence := jsonb_build_object(
      'source', 'onboarding_wizard',
      'note', concat('Ownership claim for ', coalesce(p_payload ->> 'name', 'listing')),
      'payload', coalesce(p_payload, '{}'::jsonb)
    );

    insert into public.business_claims (
      business_id, claimant_id, status, evidence, notes, expires_at
    )
    values (
      p_business_id,
      v_user_id,
      'PENDING',
      v_evidence,
      concat('Submitted from listing wizard for ', coalesce(p_payload ->> 'name', 'listing')),
      timezone('utc', now()) + interval '30 days'
    )
    returning id, status into v_claim_id, v_status;

    begin
      insert into public.verification_events (
        claim_id, provider, event_type, payload, created_by
      )
      values (
        v_claim_id,
        'manual_document',
        'submitted',
        jsonb_build_object('message', 'Ownership claim submitted for admin review'),
        v_user_id
      );
    exception
      when others then
        null;
    end;

    begin
      insert into public.audit_logs (
        actor_id, action, entity_type, entity_id, new_data
      )
      values (
        v_user_id,
        'claim_submitted',
        'business_claim',
        v_claim_id,
        jsonb_build_object('businessId', p_business_id, 'status', v_status)
      );
    exception
      when others then
        null;
    end;
  end if;

  select id into v_draft_id
  from public.onboarding_drafts
  where user_id = v_user_id and business_id is null
  for update;

  if v_draft_id is not null then
    update public.onboarding_drafts
    set
      business_id = p_business_id,
      current_step = '8',
      payload = jsonb_set(
        jsonb_set(coalesce(p_payload, '{}'::jsonb), '{claimId}', to_jsonb(v_claim_id::text), true),
        '{claimStatus}',
        to_jsonb(v_status::text),
        true
      )
    where id = v_draft_id;
  else
    insert into public.onboarding_drafts (
      user_id, business_id, current_step, payload
    )
    values (
      v_user_id,
      p_business_id,
      '8',
      jsonb_set(
        jsonb_set(coalesce(p_payload, '{}'::jsonb), '{claimId}', to_jsonb(v_claim_id::text), true),
        '{claimStatus}',
        to_jsonb(v_status::text),
        true
      )
    );
  end if;

  return jsonb_build_object(
    'claimId', v_claim_id,
    'businessId', p_business_id,
    'status', v_status
  );
end;
$$;

revoke all on function public.submit_business_claim(uuid, jsonb) from public;
grant execute on function public.submit_business_claim(uuid, jsonb)
  to authenticated, service_role;

create or replace function public.admin_moderate_claim(
  p_claim_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
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

    if v_draft is null then
      v_draft := coalesce(
        v_claim.evidence -> 'payload',
        v_claim.evidence -> 'onboarding'
      );
    end if;

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
