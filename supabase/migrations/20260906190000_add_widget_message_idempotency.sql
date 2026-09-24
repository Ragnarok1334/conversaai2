CREATE TABLE public.widget_message_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  visitor_id text NOT NULL,
  request_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  conversation_id uuid,
  reply text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT widget_message_requests_assistant_user_fkey
    FOREIGN KEY (assistant_id, user_id)
    REFERENCES public.assistants (id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT widget_message_requests_conversation_fkey
    FOREIGN KEY (conversation_id)
    REFERENCES public.conversations (id)
    ON DELETE SET NULL,
  CONSTRAINT widget_message_requests_unique
    UNIQUE (assistant_id, visitor_id, request_id)
);

ALTER TABLE public.widget_message_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.widget_message_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.widget_message_requests TO service_role;

CREATE INDEX widget_message_requests_created_at_idx
  ON public.widget_message_requests (created_at);

CREATE OR REPLACE FUNCTION public.claim_widget_message_request(
  p_assistant_id uuid,
  p_user_id uuid,
  p_visitor_id text,
  p_request_id uuid
)
RETURNS TABLE (
  claimed boolean,
  request_status text,
  stored_conversation_id uuid,
  stored_reply text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.widget_message_requests%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.assistants
    WHERE id = p_assistant_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'assistant_owner_mismatch';
  END IF;

  INSERT INTO public.widget_message_requests (
    assistant_id,
    user_id,
    visitor_id,
    request_id
  ) VALUES (
    p_assistant_id,
    p_user_id,
    p_visitor_id,
    p_request_id
  )
  ON CONFLICT (assistant_id, visitor_id, request_id) DO NOTHING
  RETURNING * INTO v_request;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_request.status, v_request.conversation_id, v_request.reply;
    RETURN;
  END IF;

  UPDATE public.widget_message_requests
  SET status = 'pending', error_code = NULL, updated_at = now()
  WHERE assistant_id = p_assistant_id
    AND visitor_id = p_visitor_id
    AND request_id = p_request_id
    AND user_id = p_user_id
    AND status = 'failed'
  RETURNING * INTO v_request;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_request.status, v_request.conversation_id, v_request.reply;
    RETURN;
  END IF;

  SELECT * INTO v_request
  FROM public.widget_message_requests
  WHERE assistant_id = p_assistant_id
    AND visitor_id = p_visitor_id
    AND request_id = p_request_id
    AND user_id = p_user_id;

  RETURN QUERY SELECT false, v_request.status, v_request.conversation_id, v_request.reply;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_widget_message_request(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_widget_message_request(uuid, uuid, text, uuid)
  TO service_role;
