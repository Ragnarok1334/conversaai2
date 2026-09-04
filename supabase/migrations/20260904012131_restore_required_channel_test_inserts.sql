-- The current API routes insert these rows with the authenticated Supabase client.
-- Restore INSERT only; existing RLS policies still require auth.uid() = user_id.
-- UPDATE/DELETE remain revoked, preventing direct mutation/removal of existing rows.
grant insert on table public.assistant_channels to authenticated;
grant insert on table public.assistant_test_messages to authenticated;
