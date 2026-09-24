CREATE OR REPLACE FUNCTION public.decrement_message_usage(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_sub_id uuid;
  v_current integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN false;
  END IF;

  SELECT id, current_messages_used
    INTO v_sub_id, v_current
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_sub_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.subscriptions
  SET current_messages_used = GREATEST(0, current_messages_used - p_amount),
      updated_at = now()
  WHERE id = v_sub_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_message_usage(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_message_usage(uuid, integer) TO service_role;

