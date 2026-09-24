create unique index if not exists billing_payments_flow_pending_user_plan_uidx on public.billing_payments (user_id, plan) where provider = 'flow' and status = 'pending';

