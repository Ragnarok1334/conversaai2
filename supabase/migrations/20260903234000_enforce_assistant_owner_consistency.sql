-- Prevent authenticated clients from attaching an assistant-owned resource
-- to a different user by forging user_id independently of assistant_id.

create unique index if not exists assistants_id_user_id_key
  on public.assistants (id, user_id);

alter table public.assistant_channels
  add constraint assistant_channels_assistant_user_fkey
  foreign key (assistant_id, user_id)
  references public.assistants (id, user_id)
  on delete cascade;

alter table public.assistant_test_messages
  add constraint assistant_test_messages_assistant_user_fkey
  foreign key (assistant_id, user_id)
  references public.assistants (id, user_id)
  on delete cascade;

create index if not exists assistant_channels_assistant_user_idx
  on public.assistant_channels (assistant_id, user_id);

create index if not exists assistant_test_messages_assistant_user_idx
  on public.assistant_test_messages (assistant_id, user_id);
