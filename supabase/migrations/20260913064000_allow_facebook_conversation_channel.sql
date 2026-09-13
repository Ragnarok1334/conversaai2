alter table public.conversations
  drop constraint if exists conversations_channel_check;

alter table public.conversations
  add constraint conversations_channel_check
  check (channel = any (array[
    'webchat'::text,
    'telegram'::text,
    'whatsapp'::text,
    'facebook'::text
  ]));

alter table public.messages
  drop constraint if exists messages_channel_check;

alter table public.messages
  add constraint messages_channel_check
  check (channel = any (array[
    'webchat'::text,
    'telegram'::text,
    'whatsapp'::text,
    'facebook'::text
  ]));
