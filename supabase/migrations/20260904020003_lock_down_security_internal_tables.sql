revoke all on table public.api_rate_limits from anon, authenticated;
revoke all on table public.security_events from anon, authenticated;
revoke all on table public.api_rate_limits from public;
revoke all on table public.security_events from public;

-- Keep the tables inaccessible through the Data API while backend SECURITY DEFINER/service-role paths retain access.
alter table public.api_rate_limits enable row level security;
alter table public.security_events enable row level security;

