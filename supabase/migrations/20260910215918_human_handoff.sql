-- Human handoff state for the shared conversations inbox.
alter table public.conversations
  add column if not exists ai_paused boolean not null default false,
  add column if not exists handoff_status text not null default 'ai',
  add column if not exists handoff_reason text,
  add column if not exists human_requested_at timestamptz,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists assigned_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conversations_handoff_status_check'
  ) then
    alter table public.conversations
      add constraint conversations_handoff_status_check
      check (handoff_status in ('ai', 'waiting', 'human'));
  end if;
end $$;

alter table public.messages
  add column if not exists sender_type text not null default 'ai';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'messages_sender_type_check'
  ) then
    alter table public.messages
      add constraint messages_sender_type_check
      check (sender_type in ('visitor', 'ai', 'human', 'system'));
  end if;
end $$;

update public.messages set sender_type = 'visitor' where role = 'user' and sender_type = 'ai';

create index if not exists conversations_handoff_inbox_idx
  on public.conversations (user_id, handoff_status, last_message_at desc);

comment on column public.conversations.ai_paused is 'Prevents AI replies while a human agent owns the conversation.';
comment on column public.conversations.handoff_status is 'Current owner of the conversation: ai, waiting, or human.';
comment on column public.messages.sender_type is 'Distinguishes visitor, AI, human, and system messages.';
