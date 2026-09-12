-- WhatsApp Cloud API channels. Provider credentials remain encrypted and are
-- only read by server-side code using the service role.
create table if not exists public.whatsapp_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assistant_id uuid not null references public.assistants(id) on delete cascade,
  business_account_id text not null,
  phone_number_id text not null,
  display_phone_number text,
  verified_name text,
  encrypted_access_token text,
  status text not null default 'pending',
  config jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  last_webhook_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_channels_status_check check (status in ('pending', 'connected', 'error', 'disabled')),
  constraint whatsapp_channels_business_account_id_check check (business_account_id ~ '^[0-9]{5,30}$'),
  constraint whatsapp_channels_phone_number_id_check check (phone_number_id ~ '^[0-9]{5,30}$'),
  constraint whatsapp_channels_assistant_unique unique (assistant_id),
  constraint whatsapp_channels_phone_number_unique unique (phone_number_id)
);

create index if not exists whatsapp_channels_owner_idx
  on public.whatsapp_channels (user_id, updated_at desc);

alter table public.whatsapp_channels enable row level security;

drop policy if exists "Owners can view WhatsApp channels" on public.whatsapp_channels;
create policy "Owners can view WhatsApp channels"
  on public.whatsapp_channels for select to authenticated
  using ((select auth.uid()) = user_id);

-- Configuration writes intentionally go through authenticated server routes.
-- Keeping client-side INSERT/UPDATE/DELETE closed prevents token ciphertext and
-- provider identifiers from being changed through the Data API.
revoke insert, update, delete on public.whatsapp_channels from anon, authenticated;
grant select on public.whatsapp_channels to authenticated;

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  channel_id uuid references public.whatsapp_channels(id) on delete set null,
  event_type text not null,
  payload_hash text not null,
  status text not null default 'received',
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint whatsapp_webhook_events_status_check check (status in ('received', 'processed', 'ignored', 'failed'))
);

create index if not exists whatsapp_webhook_events_channel_idx
  on public.whatsapp_webhook_events (channel_id, received_at desc);

alter table public.whatsapp_webhook_events enable row level security;
drop policy if exists "No client access to WhatsApp webhook events" on public.whatsapp_webhook_events;
create policy "No client access to WhatsApp webhook events"
  on public.whatsapp_webhook_events for all to authenticated
  using (false)
  with check (false);
revoke all on public.whatsapp_webhook_events from anon, authenticated;

alter table public.messages
  add column if not exists provider_message_id text;

create unique index if not exists messages_channel_provider_message_unique
  on public.messages (channel, provider_message_id)
  where provider_message_id is not null;

create unique index if not exists conversations_external_channel_unique
  on public.conversations (assistant_id, channel, external_chat_id)
  where external_chat_id is not null;

comment on table public.whatsapp_channels is 'Per-assistant WhatsApp Cloud API connection. Tokens are encrypted server-side.';
comment on table public.whatsapp_webhook_events is 'Minimal idempotency and processing audit for signed WhatsApp webhook events.';
comment on column public.messages.provider_message_id is 'Unique provider message identifier used for webhook idempotency and delivery status.';
