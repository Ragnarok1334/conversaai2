-- Prevent concurrent PayPal checkout requests from creating multiple pending orders
-- for the same user and plan. Existing production data was checked for duplicates
-- before this migration was authored.
CREATE UNIQUE INDEX IF NOT EXISTS billing_payments_paypal_pending_user_plan_uidx
  ON public.billing_payments (user_id, plan)
  WHERE provider = 'paypal' AND status = 'pending';
