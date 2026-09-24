-- Enforce tenant consistency for all new writes without blocking deployment on
-- historical rows. Existing rows must be audited before these constraints are
-- validated in a later migration.

CREATE UNIQUE INDEX IF NOT EXISTS conversations_id_user_assistant_key
  ON public.conversations (id, user_id, assistant_id);

-- PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS. These guards make
-- the migration safe for environments where the constraints were installed
-- previously but the migration itself was not recorded in schema_migrations.
DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.assistant_domains'::regclass
      AND conname = 'assistant_domains_assistant_user_fkey'
  ) THEN
    ALTER TABLE public.assistant_domains
      ADD CONSTRAINT assistant_domains_assistant_user_fkey
      FOREIGN KEY (assistant_id, user_id)
      REFERENCES public.assistants (id, user_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$constraint$;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.conversations'::regclass
      AND conname = 'conversations_assistant_user_fkey'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_assistant_user_fkey
      FOREIGN KEY (assistant_id, user_id)
      REFERENCES public.assistants (id, user_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$constraint$;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.messages'::regclass
      AND conname = 'messages_conversation_owner_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_conversation_owner_fkey
      FOREIGN KEY (conversation_id, user_id, assistant_id)
      REFERENCES public.conversations (id, user_id, assistant_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$constraint$;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.leads'::regclass
      AND conname = 'leads_conversation_owner_fkey'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_conversation_owner_fkey
      FOREIGN KEY (conversation_id, user_id, assistant_id)
      REFERENCES public.conversations (id, user_id, assistant_id)
      ON DELETE SET NULL (conversation_id)
      NOT VALID;
  END IF;
END
$constraint$;

CREATE INDEX IF NOT EXISTS assistant_domains_assistant_user_idx
  ON public.assistant_domains (assistant_id, user_id);

CREATE INDEX IF NOT EXISTS messages_conversation_owner_idx
  ON public.messages (conversation_id, user_id, assistant_id);

CREATE INDEX IF NOT EXISTS leads_conversation_owner_idx
  ON public.leads (conversation_id, user_id, assistant_id)
  WHERE conversation_id IS NOT NULL;
