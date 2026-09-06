-- Enforce tenant consistency for all new writes without blocking deployment on
-- historical rows. Existing rows must be audited before these constraints are
-- validated in a later migration.

CREATE UNIQUE INDEX IF NOT EXISTS conversations_id_user_assistant_key
  ON public.conversations (id, user_id, assistant_id);

ALTER TABLE public.assistant_domains
  ADD CONSTRAINT assistant_domains_assistant_user_fkey
  FOREIGN KEY (assistant_id, user_id)
  REFERENCES public.assistants (id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_assistant_user_fkey
  FOREIGN KEY (assistant_id, user_id)
  REFERENCES public.assistants (id, user_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_conversation_owner_fkey
  FOREIGN KEY (conversation_id, user_id, assistant_id)
  REFERENCES public.conversations (id, user_id, assistant_id)
  ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_conversation_owner_fkey
  FOREIGN KEY (conversation_id, user_id, assistant_id)
  REFERENCES public.conversations (id, user_id, assistant_id)
  ON DELETE SET NULL (conversation_id)
  NOT VALID;

CREATE INDEX IF NOT EXISTS assistant_domains_assistant_user_idx
  ON public.assistant_domains (assistant_id, user_id);

CREATE INDEX IF NOT EXISTS messages_conversation_owner_idx
  ON public.messages (conversation_id, user_id, assistant_id);

CREATE INDEX IF NOT EXISTS leads_conversation_owner_idx
  ON public.leads (conversation_id, user_id, assistant_id)
  WHERE conversation_id IS NOT NULL;
