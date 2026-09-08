-- New INR monthly pricing. Stripe Price objects are immutable, so clear old
-- mappings to fail closed until matching ₹499/₹899 Stripe prices are configured.

update public.plans
set
  price_cents = 49900,
  external_price_id = null,
  external_product_id = null,
  updated_at = timezone('utc', now())
where code = 'premium';

update public.plans
set
  price_cents = 89900,
  external_price_id = null,
  external_product_id = null,
  updated_at = timezone('utc', now())
where code = 'business';
