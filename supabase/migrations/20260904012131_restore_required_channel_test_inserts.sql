grant insert on table public.assistant_channels to authenticated;
grant insert on table public.assistant_test_messages to authenticated;

-- RLS remains the authorization boundary: both existing INSERT policies require auth.uid() = user_id.
-- UPDATE/DELETE remain revoked, so clients cannot mutate or remove existing rows directly.

