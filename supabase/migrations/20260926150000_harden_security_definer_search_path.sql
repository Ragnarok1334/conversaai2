-- Hardening SECURITY DEFINER functions
-- Only changes search_path.
-- Business logic intentionally unchanged.

CREATE OR REPLACE FUNCTION public.fulfill_flow_payment(
  p_payment_id uuid,
  p_flow_status jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_plan text;
  v_plan_limits jsonb;
BEGIN
  SELECT plan INTO v_plan 
  FROM billing_payments 
  WHERE id = p_payment_id;

  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'payment_not_found');
  END IF;

  v_plan_limits := CASE v_plan
    WHEN 'starter' THEN jsonb_build_object('assistants_limit', 1, 'messages_limit', 1000)
    WHEN 'pro' THEN jsonb_build_object('assistants_limit', 3, 'messages_limit', 4000)
    WHEN 'growth' THEN jsonb_build_object('assistants_limit', 8, 'messages_limit', 10000)
    WHEN 'business' THEN jsonb_build_object('assistants_limit', 20, 'messages_limit', 20000)
    ELSE NULL
  END;

  IF v_plan_limits IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_plan_limits',
      'detail', format('plan desconocido para fulfillment: %s', v_plan)
    );
  END IF;

  RETURN public.fulfill_payment(
    p_payment_id,
    p_flow_status,
    v_plan_limits
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.fulfill_payment(
  p_payment_id uuid,
  p_provider_response jsonb,
  p_plan_limits jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_payment billing_payments%ROWTYPE;
  v_assistants_limit integer;
  v_messages_limit integer;
BEGIN

  IF p_plan_limits IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_plan_limits',
      'detail', 'p_plan_limits es NULL'
    );
  END IF;

  IF NOT (p_plan_limits ? 'assistants_limit') THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_plan_limits',
      'detail', 'falta la clave assistants_limit'
    );
  END IF;

  IF NOT (p_plan_limits ? 'messages_limit') THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_plan_limits',
      'detail', 'falta la clave messages_limit'
    );
  END IF;

  IF jsonb_typeof(p_plan_limits -> 'assistants_limit') != 'number' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_plan_limits',
      'detail', 'assistants_limit debe ser numérico'
    );
  END IF;

  IF jsonb_typeof(p_plan_limits -> 'messages_limit') != 'number' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_plan_limits',
      'detail', 'messages_limit debe ser numérico'
    );
  END IF;

  v_assistants_limit := (p_plan_limits ->> 'assistants_limit')::integer;
  v_messages_limit := (p_plan_limits ->> 'messages_limit')::integer;

  IF v_assistants_limit IS NULL OR v_assistants_limit < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_plan_limits'
    );
  END IF;

  IF v_messages_limit IS NULL OR v_messages_limit < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'invalid_plan_limits'
    );
  END IF;


  SELECT *
  INTO v_payment
  FROM billing_payments
  WHERE id = p_payment_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'code',
      'payment_not_found'
    );
  END IF;


  IF v_payment.status != 'pending' THEN
    IF v_payment.status = 'paid' THEN
      RETURN jsonb_build_object(
        'success',
        true,
        'code',
        'already_processed'
      );
    END IF;

    RETURN jsonb_build_object(
      'success',
      false,
      'code',
      'invalid_status'
    );
  END IF;


  UPDATE billing_payments
  SET 
    status = 'paid',
    raw_response = p_provider_response,
    updated_at = now()
  WHERE id = p_payment_id;


  INSERT INTO subscriptions (
    user_id,
    plan,
    status,
    assistants_limit,
    messages_limit,
    current_messages_used,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    cancelled_at,
    cancellation_reason,
    updated_at
  )
  VALUES (
    v_payment.user_id,
    v_payment.plan,
    'active',
    v_assistants_limit,
    v_messages_limit,
    0,
    now(),
    now() + interval '1 month',
    false,
    null,
    null,
    now()
  )

  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = 'active',
    assistants_limit = EXCLUDED.assistants_limit,
    messages_limit = EXCLUDED.messages_limit,
    current_messages_used = 0,
    current_period_start = now(),
    current_period_end = now() + interval '1 month',
    cancel_at_period_end = false,
    cancelled_at = null,
    cancellation_reason = null,
    updated_at = now();


  RETURN jsonb_build_object(
    'success',
    true,
    'code',
    'processed'
  );

END;
$function$;