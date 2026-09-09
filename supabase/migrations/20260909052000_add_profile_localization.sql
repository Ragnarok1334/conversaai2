-- Regional business preferences used by the dashboard and assistants.
alter table public.profiles
  add column if not exists timezone text,
  add column if not exists currency text,
  add column if not exists locale text;

alter table public.profiles drop constraint if exists profiles_currency_format;
alter table public.profiles add constraint profiles_currency_format
  check (currency is null or currency ~ '^[A-Z]{3}$');

alter table public.profiles drop constraint if exists profiles_locale_format;
alter table public.profiles add constraint profiles_locale_format
  check (locale is null or locale ~ '^[a-z]{2}(-[A-Z]{2})?$');

alter table public.profiles drop constraint if exists profiles_timezone_length;
alter table public.profiles add constraint profiles_timezone_length
  check (timezone is null or char_length(timezone) between 1 and 80);
