-- Combine Premium + Business into a single Business subscription plan.

update public.plans
set
  name = 'Business',
  description =
    'Enhanced profile, media, offers, analytics, leads, team, and sponsored placement eligibility',
  price_cents = 49900,
  features = jsonb_build_object(
    'basicProfile', true,
    'basicProducts', true,
    'basicServices', true,
    'basicAnalytics', true,
    'enhancedProfile', true,
    'additionalMedia', true,
    'offers', true,
    'advancedAnalytics', true,
    'leadManagement', true,
    'teamMembers', true,
    'maxTeamMembers', 20,
    'maxPhotos', 120,
    'maxProducts', 500,
    'maxServices', 500,
    'sponsoredEligible', true
  ),
  sort_order = 2,
  is_active = true,
  updated_at = timezone('utc', now())
where code = 'business';

-- Move any Premium subscriptions onto Business
update public.subscriptions s
set
  plan_id = b.id,
  updated_at = timezone('utc', now())
from public.plans p
join public.plans b on b.code = 'business'
where p.code = 'premium'
  and s.plan_id = p.id
  and s.plan_id is distinct from b.id;

-- Hide Premium from the catalog (keep row for historical refs / Razorpay ids)
update public.plans
set
  is_active = false,
  description = 'Merged into Business — legacy plan code',
  updated_at = timezone('utc', now())
where code = 'premium';
