DROP INDEX IF EXISTS public.idx_conversations_assistant_id;
DROP INDEX IF EXISTS public.idx_leads_assistant_id;
DROP INDEX IF EXISTS public.idx_notifications_user_created;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;

CREATE INDEX IF NOT EXISTS assistant_channels_user_id_idx ON public.assistant_channels (user_id);
CREATE INDEX IF NOT EXISTS messages_assistant_id_idx ON public.messages (assistant_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON public.messages (user_id);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON public.reviews (user_id);
