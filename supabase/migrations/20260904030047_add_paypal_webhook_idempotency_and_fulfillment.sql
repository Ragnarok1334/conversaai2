-- Historical source for migration 20260904030047 (already applied to production).
CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.paypal_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.paypal_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.fulfill_paypal_payment(p_payment_id uuid, p_order jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_payment public.billing_payments%ROWTYPE; v_subscription public.subscriptions%ROWTYPE;
  v_now timestamptz := now(); v_plan text; v_assistants_limit integer; v_messages_limit integer;
  v_order_id text; v_order_status text; v_currency text; v_amount numeric; v_capture_id text;
BEGIN
  IF p_payment_id IS NULL OR p_order IS NULL OR jsonb_typeof(p_order) <> 'object' THEN RETURN jsonb_build_object('success',false,'code','invalid_input'); END IF;
  SELECT * INTO v_payment FROM public.billing_payments WHERE id=p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'code','payment_not_found'); END IF;
  IF v_payment.provider <> 'paypal' THEN RETURN jsonb_build_object('success',false,'code','invalid_provider'); END IF;
  v_order_id := nullif(p_order->>'id',''); v_order_status := nullif(p_order->>'status','');
  v_currency := nullif(p_order#>>'{purchase_units,0,amount,currency_code}','');
  v_amount := nullif(p_order#>>'{purchase_units,0,amount,value}','')::numeric;
  v_capture_id := nullif(p_order#>>'{purchase_units,0,payments,captures,0,id}','');
  IF v_order_id IS NULL OR v_payment.paypal_order_id IS NULL OR v_order_id <> v_payment.paypal_order_id THEN RETURN jsonb_build_object('success',false,'code','payment_mismatch'); END IF;
  IF v_order_status <> 'COMPLETED' THEN RETURN jsonb_build_object('success',false,'code','payment_not_completed'); END IF;
  IF v_currency IS NULL OR v_currency <> v_payment.currency THEN RETURN jsonb_build_object('success',false,'code','currency_mismatch'); END IF;
  IF v_amount IS NULL OR v_amount <> (v_payment.amount::numeric / 100) THEN RETURN jsonb_build_object('success',false,'code','amount_mismatch'); END IF;
  IF v_capture_id IS NULL THEN RETURN jsonb_build_object('success',false,'code','capture_not_found'); END IF;
  IF v_payment.status = 'paid' THEN RETURN jsonb_build_object('success',true,'code','already_processed','payment_id',v_payment.id,'user_id',v_payment.user_id,'plan',v_payment.plan); END IF;
  v_plan:=v_payment.plan;
  IF v_plan='starter' THEN v_assistants_limit:=1; v_messages_limit:=500;
  ELSIF v_plan='pro' THEN v_assistants_limit:=3; v_messages_limit:=2500;
  ELSIF v_plan='growth' THEN v_assistants_limit:=8; v_messages_limit:=8000;
  ELSIF v_plan='business' THEN v_assistants_limit:=20; v_messages_limit:=20000;
  ELSE RETURN jsonb_build_object('success',false,'code','invalid_paid_plan'); END IF;
  UPDATE public.billing_payments SET status='paid',paypal_capture_id=v_capture_id,raw_response=p_order,updated_at=v_now WHERE id=v_payment.id;
  SELECT * INTO v_subscription FROM public.subscriptions WHERE user_id=v_payment.user_id FOR UPDATE;
  IF FOUND THEN UPDATE public.subscriptions SET plan=v_plan,status='active',assistants_limit=v_assistants_limit,messages_limit=v_messages_limit,current_messages_used=0,current_period_start=v_now,current_period_end=v_now+interval '30 days',grace_ends_at=v_now+interval '32 days',cancel_at_period_end=false,cancelled_at=null,cancellation_reason=null,updated_at=v_now WHERE id=v_subscription.id;
  ELSE INSERT INTO public.subscriptions(user_id,plan,status,assistants_limit,messages_limit,current_messages_used,current_period_start,current_period_end,grace_ends_at,cancel_at_period_end,cancelled_at,cancellation_reason) VALUES(v_payment.user_id,v_plan,'active',v_assistants_limit,v_messages_limit,0,v_now,v_now+interval '30 days',v_now+interval '32 days',false,null,null); END IF;
  RETURN jsonb_build_object('success',true,'code','processed','payment_id',v_payment.id,'user_id',v_payment.user_id,'plan',v_plan);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fulfill_paypal_payment(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_paypal_payment(uuid,jsonb) TO service_role;
