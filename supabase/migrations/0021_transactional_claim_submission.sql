-- Idempotent, transactional ownership-claim submission.

create or replace function public.submit_business_claim(
  p_business_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_claim_id uuid;
  v_status public.claim_status;
  v_draft_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text || ':' || v_user_id::text, 0)
  );

  perform 1
  from public.businesses
  where id = p_business_id
    and status = 'PUBLISHED'
    and not is_claimed
    and deleted_at is null;

  if not found then
    raise exception 'This business is not available to claim' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.business_members
    where business_id = p_business_id and user_id = v_user_id
  ) then
    raise exception 'You already have access to this business' using errcode = '22023';
  end if;

  select id, status
  into v_claim_id, v_status
  from public.business_claims
  where business_id = p_business_id
    and claimant_id = v_user_id
    and status in ('PENDING', 'UNDER_REVIEW')
  limit 1;

  if v_claim_id is null then
    insert into public.business_claims (
      business_id, claimant_id, status, evidence, notes, expires_at
    )
    values (
      p_business_id,
      v_user_id,
      'PENDING',
      coalesce(p_payload -> 'evidence', '{}'::jsonb),
      nullif(trim(p_payload ->> 'notes'), ''),
      timezone('utc', now()) + interval '30 days'
    )
    returning id, status into v_claim_id, v_status;

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
        jsonb_set(p_payload, '{claimId}', to_jsonb(v_claim_id::text), true),
        '{claimStatus}',
        to_jsonb(v_status::text),
        true
      )
    where id = v_draft_id;
  end if;

  return jsonb_build_object(
    'claimId', v_claim_id,
    'businessId', p_business_id,
    'status', v_status
  );
end;
$$;

revoke all on function public.submit_business_claim(uuid, jsonb) from public;
grant execute on function public.submit_business_claim(uuid, jsonb) to authenticated;
