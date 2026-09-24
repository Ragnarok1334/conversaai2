BEGIN;

-- Función para POST: Crear asistente y canales atómicamente
CREATE OR REPLACE FUNCTION public.create_assistant_with_channels(
  p_user_id uuid,
  p_assistant jsonb
) RETURNS public.assistants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assistant public.assistants;
  v_channels jsonb;
  v_key text;
  v_ch_val jsonb;
  v_ch_key text;
BEGIN
  IF jsonb_typeof(p_assistant) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'p_assistant debe ser un objeto JSON';
  END IF;

  -- 1. Validar que no haya claves no permitidas
  FOR v_key IN SELECT jsonb_object_keys(p_assistant)
  LOOP
    IF v_key NOT IN (
      'assistant_name', 'business_name', 'business_type', 'tone', 'main_goal',
      'instructions', 'faqs', 'services', 'schedule', 'fallback_message',
      'language', 'status', 'behavior', 'knowledge_blocks', 'widget_config', 'channels', 'business_hours', 'business_info'
    ) THEN
      RAISE EXCEPTION 'Columna no permitida en la creación: %', v_key;
    END IF;
  END LOOP;

  -- Validaciones semánticas
  IF p_assistant ? 'assistant_name' AND (jsonb_typeof(p_assistant->'assistant_name') IS DISTINCT FROM 'string' OR length(p_assistant->>'assistant_name') = 0) THEN
    RAISE EXCEPTION 'assistant_name debe ser un string no vacío';
  END IF;
  IF p_assistant ? 'business_name' AND (jsonb_typeof(p_assistant->'business_name') IS DISTINCT FROM 'string' OR length(p_assistant->>'business_name') = 0) THEN
    RAISE EXCEPTION 'business_name debe ser un string no vacío';
  END IF;
  IF p_assistant ? 'behavior' AND jsonb_typeof(p_assistant->'behavior') IS DISTINCT FROM 'object' AND jsonb_typeof(p_assistant->'behavior') IS DISTINCT FROM 'null' THEN
    RAISE EXCEPTION 'behavior debe ser un objeto JSON';
  END IF;
  IF p_assistant ? 'knowledge_blocks' AND jsonb_typeof(p_assistant->'knowledge_blocks') IS DISTINCT FROM 'array' AND jsonb_typeof(p_assistant->'knowledge_blocks') IS DISTINCT FROM 'null' THEN
    RAISE EXCEPTION 'knowledge_blocks debe ser un array JSON';
  END IF;
  IF p_assistant ? 'widget_config' AND jsonb_typeof(p_assistant->'widget_config') IS DISTINCT FROM 'object' AND jsonb_typeof(p_assistant->'widget_config') IS DISTINCT FROM 'null' THEN
    RAISE EXCEPTION 'widget_config debe ser un objeto JSON';
  END IF;

  -- 2. Insertar asistente
  INSERT INTO public.assistants (
    user_id, assistant_name, business_name, business_type, tone, main_goal,
    instructions, faqs, services, schedule, fallback_message, language, status,
    behavior, knowledge_blocks, widget_config
  ) VALUES (
    p_user_id,
    p_assistant->>'assistant_name', p_assistant->>'business_name', p_assistant->>'business_type',
    coalesce(p_assistant->>'tone', 'profesional'), p_assistant->>'main_goal',
    coalesce(p_assistant->>'instructions', p_assistant->>'business_info'),
    p_assistant->>'faqs', p_assistant->>'services', coalesce(p_assistant->>'schedule', p_assistant->>'business_hours'),
    p_assistant->>'fallback_message', coalesce(p_assistant->>'language', 'es'),
    coalesce(p_assistant->>'status', 'active'),
    coalesce(CASE WHEN p_assistant ? 'behavior' AND jsonb_typeof(p_assistant->'behavior') IS DISTINCT FROM 'null' THEN p_assistant->'behavior' ELSE NULL END, '{}'::jsonb),
    coalesce(CASE WHEN p_assistant ? 'knowledge_blocks' AND jsonb_typeof(p_assistant->'knowledge_blocks') IS DISTINCT FROM 'null' THEN p_assistant->'knowledge_blocks' ELSE NULL END, '[]'::jsonb),
    coalesce(CASE WHEN p_assistant ? 'widget_config' AND jsonb_typeof(p_assistant->'widget_config') IS DISTINCT FROM 'null' THEN p_assistant->'widget_config' ELSE NULL END, '{}'::jsonb)
  ) RETURNING * INTO v_assistant;

  -- 3. Validar y configurar canales
  v_channels := coalesce(p_assistant->'channels', '{}'::jsonb);

  IF jsonb_typeof(v_channels) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'channels debe ser un objeto JSON';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(v_channels)
  LOOP
    IF v_key NOT IN ('webchat', 'telegram', 'whatsapp') THEN
      RAISE EXCEPTION 'Canal no soportado: %', v_key;
    END IF;

    v_ch_val := v_channels->v_key;
    IF jsonb_typeof(v_ch_val) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'El canal % debe ser un objeto JSON', v_key;
    END IF;

    FOR v_ch_key IN SELECT jsonb_object_keys(v_ch_val)
    LOOP
      IF v_ch_key != 'enabled' THEN
        RAISE EXCEPTION 'Propiedad no permitida en canal %: %', v_key, v_ch_key;
      END IF;
    END LOOP;

    IF v_ch_val ? 'enabled' AND jsonb_typeof(v_ch_val->'enabled') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'El valor de enabled en % debe ser booleano', v_key;
    END IF;
  END LOOP;

  INSERT INTO public.assistant_channels (assistant_id, user_id, channel, is_enabled, config)
  VALUES
    (v_assistant.id, p_user_id, 'webchat', coalesce((v_channels->'webchat'->>'enabled')::boolean, true), '{"status": "active"}'::jsonb),
    (v_assistant.id, p_user_id, 'telegram', coalesce((v_channels->'telegram'->>'enabled')::boolean, false), '{"status": "coming_soon"}'::jsonb),
    (v_assistant.id, p_user_id, 'whatsapp', coalesce((v_channels->'whatsapp'->>'enabled')::boolean, false), '{"status": "coming_soon"}'::jsonb);

  RETURN v_assistant;
END;
$$;

REVOKE ALL ON FUNCTION public.create_assistant_with_channels(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_assistant_with_channels(uuid, jsonb) TO service_role;

-- Función para PATCH: Actualizar asistente y canales atómicamente
CREATE OR REPLACE FUNCTION public.update_assistant_with_channels(
  p_id uuid,
  p_user_id uuid,
  p_updates jsonb
) RETURNS public.assistants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assistant public.assistants;
  v_channels jsonb;
  v_key text;
  v_ch_val jsonb;
  v_ch_key text;
BEGIN
  IF jsonb_typeof(p_updates) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'p_updates debe ser un objeto JSON';
  END IF;

  -- 1. Validar que no haya claves no permitidas
  FOR v_key IN SELECT jsonb_object_keys(p_updates)
  LOOP
    IF v_key NOT IN (
      'assistant_name', 'business_name', 'business_type', 'tone', 'main_goal',
      'instructions', 'faqs', 'services', 'schedule', 'fallback_message',
      'language', 'status', 'behavior', 'knowledge_blocks', 'widget_config', 'channels', 'name', 'objective'
    ) THEN
      RAISE EXCEPTION 'Columna no permitida en la actualización: %', v_key;
    END IF;
  END LOOP;

  -- Validaciones semánticas
  IF p_updates ? 'assistant_name' AND (jsonb_typeof(p_updates->'assistant_name') IS DISTINCT FROM 'string' OR length(p_updates->>'assistant_name') = 0) THEN
    RAISE EXCEPTION 'assistant_name debe ser un string no vacío';
  END IF;
  IF p_updates ? 'business_name' AND (jsonb_typeof(p_updates->'business_name') IS DISTINCT FROM 'string' OR length(p_updates->>'business_name') = 0) THEN
    RAISE EXCEPTION 'business_name debe ser un string no vacío';
  END IF;
  IF p_updates ? 'behavior' AND jsonb_typeof(p_updates->'behavior') IS DISTINCT FROM 'object' AND jsonb_typeof(p_updates->'behavior') IS DISTINCT FROM 'null' THEN
    RAISE EXCEPTION 'behavior debe ser un objeto JSON';
  END IF;
  IF p_updates ? 'knowledge_blocks' AND jsonb_typeof(p_updates->'knowledge_blocks') IS DISTINCT FROM 'array' AND jsonb_typeof(p_updates->'knowledge_blocks') IS DISTINCT FROM 'null' THEN
    RAISE EXCEPTION 'knowledge_blocks debe ser un array JSON';
  END IF;
  IF p_updates ? 'widget_config' AND jsonb_typeof(p_updates->'widget_config') IS DISTINCT FROM 'object' AND jsonb_typeof(p_updates->'widget_config') IS DISTINCT FROM 'null' THEN
    RAISE EXCEPTION 'widget_config debe ser un objeto JSON';
  END IF;

  -- 2. Bloquear fila (Pessimistic Locking)
  SELECT * INTO v_assistant
  FROM public.assistants
  WHERE id = p_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asistente no encontrado o sin permisos de escritura';
  END IF;

  -- 3. Actualizar asistente explícitamente sin SQL dinámico
  UPDATE public.assistants SET
    assistant_name = CASE WHEN p_updates ? 'assistant_name' THEN p_updates->>'assistant_name' WHEN p_updates ? 'name' THEN p_updates->>'name' ELSE assistant_name END,
    business_name = CASE WHEN p_updates ? 'business_name' THEN p_updates->>'business_name' ELSE business_name END,
    business_type = CASE WHEN p_updates ? 'business_type' THEN p_updates->>'business_type' ELSE business_type END,
    tone = CASE WHEN p_updates ? 'tone' THEN p_updates->>'tone' ELSE tone END,
    main_goal = CASE WHEN p_updates ? 'main_goal' THEN p_updates->>'main_goal' WHEN p_updates ? 'objective' THEN p_updates->>'objective' ELSE main_goal END,
    instructions = CASE WHEN p_updates ? 'instructions' THEN p_updates->>'instructions' ELSE instructions END,
    faqs = CASE WHEN p_updates ? 'faqs' THEN p_updates->>'faqs' ELSE faqs END,
    services = CASE WHEN p_updates ? 'services' THEN p_updates->>'services' ELSE services END,
    schedule = CASE WHEN p_updates ? 'schedule' THEN p_updates->>'schedule' ELSE schedule END,
    fallback_message = CASE WHEN p_updates ? 'fallback_message' THEN p_updates->>'fallback_message' ELSE fallback_message END,
    language = CASE WHEN p_updates ? 'language' THEN p_updates->>'language' ELSE language END,
    status = CASE WHEN p_updates ? 'status' THEN p_updates->>'status' ELSE status END,
    behavior = CASE WHEN p_updates ? 'behavior' AND jsonb_typeof(p_updates->'behavior') = 'null' THEN '{}'::jsonb WHEN p_updates ? 'behavior' THEN p_updates->'behavior' ELSE behavior END,
    knowledge_blocks = CASE WHEN p_updates ? 'knowledge_blocks' AND jsonb_typeof(p_updates->'knowledge_blocks') = 'null' THEN '[]'::jsonb WHEN p_updates ? 'knowledge_blocks' THEN p_updates->'knowledge_blocks' ELSE knowledge_blocks END,
    widget_config = CASE WHEN p_updates ? 'widget_config' AND jsonb_typeof(p_updates->'widget_config') = 'null' THEN '{}'::jsonb WHEN p_updates ? 'widget_config' THEN p_updates->'widget_config' ELSE widget_config END,
    updated_at = now()
  WHERE id = p_id AND user_id = p_user_id
  RETURNING * INTO v_assistant;

  -- 4. Actualizar canales si existen
  IF p_updates ? 'channels' THEN
    v_channels := p_updates->'channels';

    IF jsonb_typeof(v_channels) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'channels debe ser un objeto JSON';
    END IF;

    FOR v_key IN SELECT jsonb_object_keys(v_channels)
    LOOP
      IF v_key NOT IN ('webchat', 'telegram', 'whatsapp') THEN
        RAISE EXCEPTION 'Canal no soportado: %', v_key;
      END IF;

      v_ch_val := v_channels->v_key;
      IF jsonb_typeof(v_ch_val) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'El canal % debe ser un objeto JSON', v_key;
      END IF;

      FOR v_ch_key IN SELECT jsonb_object_keys(v_ch_val)
      LOOP
        IF v_ch_key != 'enabled' THEN
          RAISE EXCEPTION 'Propiedad no permitida en canal %: %', v_key, v_ch_key;
        END IF;
      END LOOP;

      IF v_ch_val ? 'enabled' AND jsonb_typeof(v_ch_val->'enabled') IS DISTINCT FROM 'boolean' THEN
        RAISE EXCEPTION 'El valor de enabled en % debe ser booleano', v_key;
      END IF;
    END LOOP;

    IF v_channels ? 'webchat' THEN
      INSERT INTO public.assistant_channels (assistant_id, user_id, channel, is_enabled, config)
      VALUES (p_id, p_user_id, 'webchat', (v_channels->'webchat'->>'enabled')::boolean, '{"status": "active"}'::jsonb)
      ON CONFLICT (assistant_id, channel) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;

    IF v_channels ? 'telegram' THEN
      INSERT INTO public.assistant_channels (assistant_id, user_id, channel, is_enabled, config)
      VALUES (p_id, p_user_id, 'telegram', (v_channels->'telegram'->>'enabled')::boolean, '{"status": "coming_soon"}'::jsonb)
      ON CONFLICT (assistant_id, channel) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;

    IF v_channels ? 'whatsapp' THEN
      INSERT INTO public.assistant_channels (assistant_id, user_id, channel, is_enabled, config)
      VALUES (p_id, p_user_id, 'whatsapp', (v_channels->'whatsapp'->>'enabled')::boolean, '{"status": "coming_soon"}'::jsonb)
      ON CONFLICT (assistant_id, channel) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;
  END IF;

  RETURN v_assistant;
END;
$$;

REVOKE ALL ON FUNCTION public.update_assistant_with_channels(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_assistant_with_channels(uuid, uuid, jsonb) TO service_role;

COMMIT;
