-- Facebook Messenger pages connected to one assistant. Page access tokens are
-- encrypted by the server and are never returned through the Data API.
create table if not exists public.facebook_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assistant_id uuid not null references public.assistants(id) on delete cascade,
  page_id text not null,
  page_name text,
  encrypted_page_access_token text not null,
  status text not null default 'pending',
  config jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  last_webhook_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint facebook_channels_status_check check (status in ('pending','connected','error','disabled')),
  constraint facebook_channels_page_id_check check (page_id ~ '^[0-9]{5,30}$'),
  constraint facebook_channels_assistant_unique unique (assistant_id),
  constraint facebook_channels_page_unique unique (page_id)
);

create index if not exists facebook_channels_owner_idx
  on public.facebook_channels (user_id, updated_at desc);

alter table public.facebook_channels enable row level security;
drop policy if exists "Owners can view Facebook channels" on public.facebook_channels;
create policy "Owners can view Facebook channels"
  on public.facebook_channels for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.facebook_channels from anon;
revoke insert, update, delete on public.facebook_channels from authenticated;
grant select (id,user_id,assistant_id,page_id,page_name,status,config,connected_at,last_webhook_at,last_error,created_at,updated_at)
  on public.facebook_channels to authenticated;

create table if not exists public.facebook_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  channel_id uuid references public.facebook_channels(id) on delete set null,
  event_type text not null,
  payload_hash text not null,
  status text not null default 'received',
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint facebook_webhook_events_status_check check (status in ('received','processed','ignored','failed'))
);

create index if not exists facebook_webhook_events_channel_idx
  on public.facebook_webhook_events (channel_id, received_at desc);
alter table public.facebook_webhook_events enable row level security;
drop policy if exists "No client access to Facebook webhook events" on public.facebook_webhook_events;
create policy "No client access to Facebook webhook events"
  on public.facebook_webhook_events for all to authenticated
  using (false)
  with check (false);
revoke all on public.facebook_webhook_events from anon, authenticated;

comment on table public.facebook_channels is 'Per-assistant Facebook Page connection. Page tokens remain encrypted server-side.';
comment on table public.facebook_webhook_events is 'Private idempotency and processing audit for signed Messenger webhooks.';
