alter table public.notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.user_settings
  add column if not exists chat_sound_enabled boolean not null default true,
  add column if not exists notification_sound_enabled boolean not null default true;

comment on column public.user_settings.chat_sound_enabled is
  'Play a sound for new customer conversation messages while the dashboard is open.';

comment on column public.user_settings.notification_sound_enabled is
  'Play a sound for non-conversation dashboard alerts while the dashboard is open.';
