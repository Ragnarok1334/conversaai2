DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;

-- Keep read-only access for the owning authenticated user. Remove the redundant public SELECT policies.
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;

CREATE POLICY "subscriptions_select_own"
ON public.subscriptions
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

