REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.billing_payments FROM anon, authenticated;
REVOKE SELECT ON public.billing_payments FROM anon;
REVOKE REFERENCES, TRIGGER, TRUNCATE ON public.subscriptions FROM anon, authenticated;
REVOKE SELECT ON public.subscriptions FROM anon;

DROP POLICY IF EXISTS "Users can view own billing payments" ON public.billing_payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.billing_payments;
DROP POLICY IF EXISTS "billing_payments_select_own" ON public.billing_payments;

CREATE POLICY "billing_payments_select_own"
ON public.billing_payments
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

