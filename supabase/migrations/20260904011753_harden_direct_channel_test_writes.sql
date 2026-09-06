revoke insert, update, delete on table public.assistant_channels from authenticated;
revoke insert, update, delete on table public.assistant_test_messages from authenticated;
revoke select on table public.audit_logs from authenticated;

-- These tables are mutated through authenticated server routes/RPCs, not directly
-- from the browser. Keep RLS enabled as defense in depth while removing the
-- direct client write surface and audit-log read surface.

