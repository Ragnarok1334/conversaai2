-- Keep future channel identities explicit while integrations remain disabled.
alter table public.assistant_channels
  drop constraint if exists assistant_channels_channel_check;

alter table public.assistant_channels
  add constraint assistant_channels_channel_check
  check (
    channel = any (
      array[
        'webchat'::text,
        'telegram'::text,
        'whatsapp'::text,
        'instagram'::text,
        'facebook'::text
      ]
    )
  );
