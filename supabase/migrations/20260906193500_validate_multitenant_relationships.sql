-- The pre-deployment integrity audit found zero inconsistent rows for all four
-- tenant relationships. Validate the constraints added by the preceding
-- migration so PostgreSQL also guarantees the historical data.

ALTER TABLE public.assistant_domains
  VALIDATE CONSTRAINT assistant_domains_assistant_user_fkey;

ALTER TABLE public.conversations
  VALIDATE CONSTRAINT conversations_assistant_user_fkey;

ALTER TABLE public.messages
  VALIDATE CONSTRAINT messages_conversation_owner_fkey;

ALTER TABLE public.leads
  VALIDATE CONSTRAINT leads_conversation_owner_fkey;
