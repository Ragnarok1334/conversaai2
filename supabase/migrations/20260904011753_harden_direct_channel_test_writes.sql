-- Keep assistant channel/test-message writes behind RLS and remove direct mutation privileges.
-- INSERT is restored by the follow-up migration because the current server routes use the
-- authenticated Supabase client for these inserts; UPDATE/DELETE remain revoked.
revoke insert, update, delete on table public.assistant_channels from authenticated;
revoke insert, update, delete on table public.assistant_test_messages from authenticated;
revoke select on table public.audit_logs from authenticated;
