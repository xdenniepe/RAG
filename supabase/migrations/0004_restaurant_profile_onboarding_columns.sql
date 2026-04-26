alter table public.restaurant_profiles
  drop column if exists account_name,
  add column if not exists target_clientele text,
  add column if not exists restaurant_street_address text,
  add column if not exists restaurant_address_line2 text,
  add column if not exists restaurant_city text,
  add column if not exists restaurant_state text,
  add column if not exists restaurant_country text,
  add column if not exists menu_pdf_file_name text,
  add column if not exists beverage_program_goals text;

update public.restaurant_profiles
set target_clientele = coalesce(target_clientele, target_audience)
where target_audience is not null;

alter table public.restaurant_profiles
  drop column if exists target_audience,
  drop column if exists price_positioning,
  drop column if exists brand_story;
