alter table public.billing_payments add column if not exists paypal_order_id text, add column if not exists paypal_capture_id text;
create unique index if not exists billing_payments_paypal_order_id_uidx on public.billing_payments(paypal_order_id) where paypal_order_id is not null;
create unique index if not exists billing_payments_paypal_capture_id_uidx on public.billing_payments(paypal_capture_id) where paypal_capture_id is not null;

