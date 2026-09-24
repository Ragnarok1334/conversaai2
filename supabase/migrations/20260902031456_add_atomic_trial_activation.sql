CREATE OR REPLACE FUNCTION public.activate_trial(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_trial_used boolean;
  v_plan text;
  v_status text;
  v_trial_start timestamptz := now();
  v_trial_end timestamptz := now() + interval '7 days';
BEGIN
  SELECT trial_used
    INTO v_trial_used
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_trial_used THEN
    RETURN false;
  END IF;

  SELECT plan, status
    INTO v_plan, v_status
  FROM public.subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF FOUND AND v_status = 'active' AND v_plan NOT IN ('trial', 'free') THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET trial_used = true,
      trial_started_at = v_trial_start,
      trial_ends_at = v_trial_end,
      updated_at = now()
  WHERE id = p_user_id;

  IF FOUND THEN
    UPDATE public.subscriptions
    SET plan = 'trial',
        status = 'active',
        assistants_limit = 1,
        messages_limit = 100,
        current_messages_used = 0,
        current_period_start = v_trial_start,
        current_period_end = v_trial_end,
        cancel_at_period_end = false,
        cancelled_at = null,
        cancellation_reason = null,
        updated_at = now()
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      INSERT INTO public.subscriptions (
        user_id, plan, status, assistants_limit, messages_limit,
        current_messages_used, current_period_start, current_period_end,
        cancel_at_period_end, cancelled_at, cancellation_reason
      ) VALUES (
        p_user_id, 'trial', 'active', 1, 100,
        0, v_trial_start, v_trial_end,
        false, null, null
      );
    END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_trial(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_trial(uuid) TO service_role;

