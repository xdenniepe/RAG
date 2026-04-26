alter table public.restaurant_profiles
  add column if not exists account_name text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_accent_color text,
  add column if not exists restaurant_location text,
  add column if not exists restaurant_website text,
  add column if not exists restaurant_vibe text,
  add column if not exists target_clientele text,
  add column if not exists onboarding_completed_at timestamptz;

create index if not exists restaurant_profiles_onboarding_completed_idx
  on public.restaurant_profiles (onboarding_completed_at);
