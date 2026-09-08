-- ApnaPick: Row Level Security — deny by default; public read published; members write own; admin full
-- Note: service_role bypasses RLS in Supabase by design.

-- ---------------------------------------------------------------------------
-- Enable RLS on all public tables
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.geographic_areas enable row level security;
alter table public.businesses enable row level security;
alter table public.business_locations enable row level security;
alter table public.business_members enable row level security;
alter table public.business_claims enable row level security;
alter table public.verification_events enable row level security;
alter table public.business_hours enable row level security;
alter table public.special_hours enable row level security;
alter table public.photos enable row level security;
alter table public.onboarding_drafts enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.business_categories enable row level security;
alter table public.attributes enable row level security;
alter table public.business_attributes enable row level security;
alter table public.tags enable row level security;
alter table public.business_tags enable row level security;
alter table public.products enable row level security;
alter table public.services enable row level security;
alter table public.menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.leads enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.searches enable row level security;
alter table public.search_events enable row level security;
alter table public.business_metrics_daily enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.seo_pages enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

create policy profiles_select_anon_limited
  on public.profiles for select
  to anon
  using (true);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_admin_all
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------------

create policy user_roles_select_own_or_admin
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy user_roles_super_admin_write
  on public.user_roles for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy user_roles_admin_manage_non_super
  on public.user_roles for insert
  to authenticated
  with check (
    public.is_admin()
    and role not in ('SUPER_ADMIN')
  );

create policy user_roles_admin_delete_non_super
  on public.user_roles for delete
  to authenticated
  using (
    public.is_admin()
    and role not in ('SUPER_ADMIN')
  );

-- ---------------------------------------------------------------------------
-- geographic_areas — public read; admin write
-- ---------------------------------------------------------------------------

create policy geographic_areas_public_read
  on public.geographic_areas for select
  to anon, authenticated
  using (true);

create policy geographic_areas_admin_write
  on public.geographic_areas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------

create policy businesses_public_read_published
  on public.businesses for select
  to anon, authenticated
  using (
    (status = 'PUBLISHED' and deleted_at is null)
    or (auth.uid() is not null and public.is_business_member(id))
    or public.is_admin()
  );

create policy businesses_member_insert
  on public.businesses for insert
  to authenticated
  with check (
    created_by = auth.uid()
    or public.is_admin()
  );

create policy businesses_member_update
  on public.businesses for update
  to authenticated
  using (
    public.has_business_permission(id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(id, 'manage_profile')
    or public.is_admin()
  );

create policy businesses_admin_delete
  on public.businesses for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Helper: published business visibility for child rows
-- ---------------------------------------------------------------------------

create or replace function public.business_is_publicly_readable(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.status = 'PUBLISHED'
      and b.deleted_at is null
  );
$$;

revoke all on function public.business_is_publicly_readable(uuid) from public;
grant execute on function public.business_is_publicly_readable(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- business_locations / hours / photos / catalog children
-- ---------------------------------------------------------------------------

create policy business_locations_select
  on public.business_locations for select
  to anon, authenticated
  using (
    public.business_is_publicly_readable(business_id)
    or public.is_business_member(business_id)
    or public.is_admin()
  );

create policy business_locations_member_write
  on public.business_locations for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

create policy business_hours_select
  on public.business_hours for select
  to anon, authenticated
  using (
    public.business_is_publicly_readable(business_id)
    or public.is_business_member(business_id)
    or public.is_admin()
  );

create policy business_hours_member_write
  on public.business_hours for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

create policy special_hours_select
  on public.special_hours for select
  to anon, authenticated
  using (
    public.business_is_publicly_readable(business_id)
    or public.is_business_member(business_id)
    or public.is_admin()
  );

create policy special_hours_member_write
  on public.special_hours for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

create policy photos_select
  on public.photos for select
  to anon, authenticated
  using (
    deleted_at is null
    and (
      public.business_is_publicly_readable(business_id)
      or public.is_business_member(business_id)
      or public.is_admin()
    )
  );

create policy photos_member_write
  on public.photos for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- business_members
-- ---------------------------------------------------------------------------

create policy business_members_select
  on public.business_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_business_member(business_id)
    or public.is_admin()
  );

create policy business_members_owner_write
  on public.business_members for all
  to authenticated
  using (
    public.is_business_owner(business_id)
    or public.is_admin()
  )
  with check (
    public.is_business_owner(business_id)
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- claims + verification
-- ---------------------------------------------------------------------------

create policy business_claims_select
  on public.business_claims for select
  to authenticated
  using (
    claimant_id = auth.uid()
    or public.is_business_member(business_id)
    or public.is_admin()
  );

create policy business_claims_insert_own
  on public.business_claims for insert
  to authenticated
  with check (claimant_id = auth.uid());

create policy business_claims_update_own_or_admin
  on public.business_claims for update
  to authenticated
  using (claimant_id = auth.uid() or public.is_admin())
  with check (claimant_id = auth.uid() or public.is_admin());

create policy verification_events_select
  on public.verification_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_claims c
      where c.id = claim_id
        and (
          c.claimant_id = auth.uid()
          or public.is_admin()
        )
    )
  );

create policy verification_events_insert_admin_or_claimant
  on public.verification_events for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.business_claims c
      where c.id = claim_id
        and c.claimant_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- onboarding drafts
-- ---------------------------------------------------------------------------

create policy onboarding_drafts_own
  on public.onboarding_drafts for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Taxonomy / attributes / tags — public read; admin write
-- ---------------------------------------------------------------------------

create policy categories_public_read
  on public.categories for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy categories_admin_write
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy subcategories_public_read
  on public.subcategories for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy subcategories_admin_write
  on public.subcategories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy attributes_public_read
  on public.attributes for select
  to anon, authenticated
  using (true);

create policy attributes_admin_write
  on public.attributes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy tags_public_read
  on public.tags for select
  to anon, authenticated
  using (true);

create policy tags_admin_write
  on public.tags for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy business_categories_select
  on public.business_categories for select
  to anon, authenticated
  using (
    public.business_is_publicly_readable(business_id)
    or public.is_business_member(business_id)
    or public.is_admin()
  );

create policy business_categories_member_write
  on public.business_categories for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

create policy business_attributes_select
  on public.business_attributes for select
  to anon, authenticated
  using (
    public.business_is_publicly_readable(business_id)
    or public.is_business_member(business_id)
    or public.is_admin()
  );

create policy business_attributes_member_write
  on public.business_attributes for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

create policy business_tags_select
  on public.business_tags for select
  to anon, authenticated
  using (
    public.business_is_publicly_readable(business_id)
    or public.is_business_member(business_id)
    or public.is_admin()
  );

create policy business_tags_member_write
  on public.business_tags for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- products / services / menus / offers
-- ---------------------------------------------------------------------------

create policy products_select
  on public.products for select
  to anon, authenticated
  using (
    deleted_at is null
    and (
      public.business_is_publicly_readable(business_id)
      or public.is_business_member(business_id)
      or public.is_admin()
    )
  );

create policy products_member_write
  on public.products for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

create policy services_select
  on public.services for select
  to anon, authenticated
  using (
    deleted_at is null
    and (
      public.business_is_publicly_readable(business_id)
      or public.is_business_member(business_id)
      or public.is_admin()
    )
  );

create policy services_member_write
  on public.services for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

create policy menus_select
  on public.menus for select
  to anon, authenticated
  using (
    public.business_is_publicly_readable(business_id)
    or public.is_business_member(business_id)
    or public.is_admin()
  );

create policy menus_member_write
  on public.menus for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

create policy menu_categories_select
  on public.menu_categories for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.menus m
      where m.id = menu_id
        and (
          public.business_is_publicly_readable(m.business_id)
          or public.is_business_member(m.business_id)
          or public.is_admin()
        )
    )
  );

create policy menu_categories_member_write
  on public.menu_categories for all
  to authenticated
  using (
    exists (
      select 1
      from public.menus m
      where m.id = menu_id
        and (
          public.has_business_permission(m.business_id, 'manage_profile')
          or public.is_admin()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.menus m
      where m.id = menu_id
        and (
          public.has_business_permission(m.business_id, 'manage_profile')
          or public.is_admin()
        )
    )
  );

create policy menu_items_select
  on public.menu_items for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.menu_categories mc
      join public.menus m on m.id = mc.menu_id
      where mc.id = menu_category_id
        and (
          public.business_is_publicly_readable(m.business_id)
          or public.is_business_member(m.business_id)
          or public.is_admin()
        )
    )
  );

create policy menu_items_member_write
  on public.menu_items for all
  to authenticated
  using (
    exists (
      select 1
      from public.menu_categories mc
      join public.menus m on m.id = mc.menu_id
      where mc.id = menu_category_id
        and (
          public.has_business_permission(m.business_id, 'manage_profile')
          or public.is_admin()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.menu_categories mc
      join public.menus m on m.id = mc.menu_id
      where mc.id = menu_category_id
        and (
          public.has_business_permission(m.business_id, 'manage_profile')
          or public.is_admin()
        )
    )
  );

create policy offers_select
  on public.offers for select
  to anon, authenticated
  using (
    deleted_at is null
    and is_active
    and (
      public.business_is_publicly_readable(business_id)
      or public.is_business_member(business_id)
      or public.is_admin()
    )
  );

create policy offers_member_write
  on public.offers for all
  to authenticated
  using (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  )
  with check (
    public.has_business_permission(business_id, 'manage_profile')
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- reviews / favorites / leads / notifications / reports
-- ---------------------------------------------------------------------------

create policy reviews_public_read
  on public.reviews for select
  to anon, authenticated
  using (
    deleted_at is null
    and status = 'PUBLISHED'
    and public.business_is_publicly_readable(business_id)
  );

create policy reviews_own_read
  on public.reviews for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.is_business_member(business_id));

create policy reviews_insert_own
  on public.reviews for insert
  to authenticated
  with check (user_id = auth.uid());

create policy reviews_update_own_or_admin
  on public.reviews for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.is_business_owner(business_id))
  with check (user_id = auth.uid() or public.is_admin() or public.is_business_owner(business_id));

create policy favorites_own
  on public.favorites for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy leads_insert
  on public.leads for insert
  to anon, authenticated
  with check (
    public.business_is_publicly_readable(business_id)
    and (user_id is null or user_id = auth.uid())
  );

create policy leads_select_member_or_own
  on public.leads for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_business_member(business_id)
    or public.is_admin()
  );

create policy notifications_own
  on public.notifications for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy reports_insert
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy reports_select_own_or_admin
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy reports_admin_update
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- search analytics — insert for clients; read admin / own events
-- ---------------------------------------------------------------------------

create policy searches_admin_read
  on public.searches for select
  to authenticated
  using (public.is_admin());

create policy searches_insert
  on public.searches for insert
  to anon, authenticated
  with check (true);

create policy searches_update_counters
  on public.searches for update
  to anon, authenticated
  using (true)
  with check (true);

create policy search_events_insert
  on public.search_events for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create policy search_events_select
  on public.search_events for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy business_metrics_member_read
  on public.business_metrics_daily for select
  to authenticated
  using (
    public.is_business_member(business_id)
    or public.is_admin()
  );

create policy business_metrics_admin_write
  on public.business_metrics_daily for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- commerce / seo / audit
-- ---------------------------------------------------------------------------

create policy plans_public_read
  on public.plans for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy plans_admin_write
  on public.plans for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy subscriptions_member_read
  on public.subscriptions for select
  to authenticated
  using (
    public.is_business_member(business_id)
    or public.is_admin()
  );

create policy subscriptions_admin_write
  on public.subscriptions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy payments_member_read
  on public.payments for select
  to authenticated
  using (
    public.is_business_member(business_id)
    or public.is_admin()
  );

create policy payments_admin_write
  on public.payments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy seo_pages_public_read
  on public.seo_pages for select
  to anon, authenticated
  using (true);

create policy seo_pages_admin_write
  on public.seo_pages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy audit_logs_admin_read
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

create policy audit_logs_insert_authenticated
  on public.audit_logs for insert
  to authenticated
  with check (actor_id is null or actor_id = auth.uid() or public.is_admin());
