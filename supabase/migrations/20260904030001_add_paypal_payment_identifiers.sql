-- Historical source for migration 20260904030001 (already applied to production).
ALTER TABLE public.billing_payments
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS paypal_capture_id text;

CREATE UNIQUE INDEX IF NOT EXISTS billing_payments_paypal_order_id_uidx
  ON public.billing_payments (paypal_order_id) WHERE paypal_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS billing_payments_paypal_capture_id_uidx
  ON public.billing_payments (paypal_capture_id) WHERE paypal_capture_id IS NOT NULL;
