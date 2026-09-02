-- Atomic Flow payment confirmation and subscription activation.
-- Applied to the connected Supabase project as migration atomic_flow_payment_fulfillment.
CREATE OR REPLACE FUNCTION public.fulfill_flow_payment(p_payment_id uuid, p_flow_status jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_payment public.billing_payments%ROWTYPE;
  v_subscription public.subscriptions%ROWTYPE;
  v_plan text;
  v_assistants_limit integer;
  v_messages_limit integer;
  v_now timestamptz := now();
BEGIN
  IF p_payment_id IS NULL OR p_flow_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_input');
  END IF;

  SELECT * INTO v_payment
  FROM public.billing_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'payment_not_found');
  END IF;

  IF v_payment.provider <> 'flow' THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_provider');
  END IF;

  IF COALESCE(p_flow_status->>'commerceOrder', '') <> COALESCE(v_payment.flow_order, '')
     OR COALESCE(p_flow_status->>'currency', '') <> COALESCE(v_payment.currency, '')
     OR NULLIF(p_flow_status->>'amount', '')::numeric <> v_payment.amount::numeric THEN
    RETURN jsonb_build_object('success', false, 'code', 'payment_mismatch');
  END IF;

  IF COALESCE((p_flow_status->>'status')::integer, 0) <> 2 THEN
    RETURN jsonb_build_object('success', false, 'code', 'payment_not_paid');
  END IF;

  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'code', 'already_processed', 'payment_id', v_payment.id, 'user_id', v_payment.user_id, 'plan', v_payment.plan);
  END IF;

  v_plan := v_payment.plan;
  IF v_plan = 'starter' THEN v_assistants_limit := 1; v_messages_limit := 500;
  ELSIF v_plan = 'pro' THEN v_assistants_limit := 3; v_messages_limit := 2500;
  ELSIF v_plan = 'growth' THEN v_assistants_limit := 8; v_messages_limit := 8000;
  ELSIF v_plan = 'business' THEN v_assistants_limit := 20; v_messages_limit := 20000;
  ELSE RETURN jsonb_build_object('success', false, 'code', 'invalid_paid_plan');
  END IF;

  UPDATE public.billing_payments
  SET status = 'paid', raw_response = p_flow_status,
      metadata = COALESCE(metadata, '{}'::jsonb) || CASE WHEN status = 'cancelled' THEN jsonb_build_object('recoveredFromCancelled', true) ELSE '{}'::jsonb END,
      updated_at = v_now
  WHERE id = v_payment.id;

  SELECT * INTO v_subscription FROM public.subscriptions WHERE user_id = v_payment.user_id FOR UPDATE;

  IF FOUND THEN
    UPDATE public.subscriptions
    SET plan = v_plan, status = 'active', assistants_limit = v_assistants_limit, messages_limit = v_messages_limit,
        current_messages_used = 0, current_period_start = v_now, current_period_end = v_now + interval '30 days',
        grace_ends_at = v_now + interval '32 days', cancel_at_period_end = false, cancelled_at = null,
        cancellation_reason = null, updated_at = v_now
    WHERE id = v_subscription.id;
  ELSE
    INSERT INTO public.subscriptions (user_id, plan, status, assistants_limit, messages_limit, current_messages_used,
      current_period_start, current_period_end, grace_ends_at, cancel_at_period_end, cancelled_at, cancellation_reason)
    VALUES (v_payment.user_id, v_plan, 'active', v_assistants_limit, v_messages_limit, 0,
      v_now, v_now + interval '30 days', v_now + interval '32 days', false, null, null);
  END IF;

  RETURN jsonb_build_object('success', true, 'code', 'processed', 'payment_id', v_payment.id, 'user_id', v_payment.user_id, 'plan', v_plan);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fulfill_flow_payment(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_flow_payment(uuid, jsonb) TO service_role;
