-- ════════════════════════════════════════════════════════════════════════════
-- FASE 5.9.3: FULFILLMENT CORE — RPC agnóstica de proveedor
-- ════════════════════════════════════════════════════════════════════════════
-- PROPÓSITO: Extraer la lógica de fulfillment (paid → subscriptions) de
--            fulfill_flow_payment hacia una RPC agnóstica reusable por
--            cualquier proveedor (Flow, PayPal, futuros), sin romper el
--            contrato actual del webhook Flow.
--
-- ALCANCE:
--   1. CREATE fulfill_payment(p_payment_id, p_provider_response, p_plan_limits)
--      — agnóstico de proveedor, valida estructura de p_plan_limits,
--        SIN COALESCE silencioso: si faltan claves o son inválidas, falla
--        explícitamente en vez de aplicar defaults ocultos.
--   2. REPLACE fulfill_flow_payment(p_payment_id, p_flow_status) para que
--      sea un wrapper delgado: calcula p_plan_limits desde el plan de la
--      fila (alineado 1:1 con src/lib/plans.ts) y delega en fulfill_payment.
--      Firma y contrato de retorno IDÉNTICOS a los usados hoy por
--      src/app/api/webhooks/flow/route.ts:97-100. NO se modifica ese archivo.
--   3. fulfill_paypal_payment NO se toca (función legacy, se mantiene).
--   4. subscriptions se actualiza vía INSERT ... ON CONFLICT (user_id) DO
--      UPDATE, apoyado en el índice único real confirmado por introspección:
--        subscriptions_user_id_key — CREATE UNIQUE INDEX ... USING btree (user_id)
--
-- NO ALCANCE (explícito, por instrucción):
--   - NO se modifica checkout (flow/checkout/route.ts, checkout-service.ts).
--   - NO se modifica el webhook Flow (webhooks/flow/route.ts).
--   - NO se eliminan funciones legacy (fulfill_paypal_payment se conserva).
--
-- SCHEMA CONFIRMADO POR INTROSPECCIÓN REAL (no asumido):
--   - RPCs reales expuestas en PostgREST: fulfill_flow_payment,
--     fulfill_paypal_payment (ambas ya activas, no solo documentadas).
--   - Índice único real confirmado vía pg_indexes: subscriptions_user_id_key
--     — CREATE UNIQUE INDEX ... ON public.subscriptions USING btree (user_id)
--
-- LÍMITES POR PLAN: alineados con src/lib/plans.ts (PLAN_CONFIGS) al
-- 2026-09-22. Los valores hardcodeados en el fulfillment legacy (comentado
-- en 20260921000000_document_billing_schema.sql) estaban DESALINEADOS con
-- plans.ts (ej. pro 5000 vs 4000 real, growth 20000 vs 10000 real, business
-- 100000 vs 20000 real). Este archivo corrige esa divergencia usando los
-- valores reales de plans.ts:
--   starter  → assistants_limit=1,  messages_limit=1000
--   pro      → assistants_limit=3,  messages_limit=4000
--   growth   → assistants_limit=8,  messages_limit=10000
--   business → assistants_limit=20, messages_limit=20000
-- Deuda conocida (documentada, no resuelta en esta fase): estos valores
-- viven duplicados en SQL y en plans.ts. Fases futuras podrían hacer que
-- el webhook calcule p_plan_limits en TS y lo pase directo a fulfill_payment.
-- No se hace ahora por regla explícita "no modificar Flow webhook todavía".
--
-- SEGURIDAD: SECURITY DEFINER + SET search_path = public (mismo patrón que
-- el fulfillment legacy documentado). Invocable solo vía service_role.
-- FECHA: 2026-09-23
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. RPC AGNÓSTICA: fulfill_payment ─────────────────────────────────────
-- Firma: fulfill_payment(p_payment_id uuid, p_provider_response jsonb,
--                         p_plan_limits jsonb)
-- p_plan_limits estructura EXIGIDA (sin defaults silenciosos):
--   { "assistants_limit": <integer >= 0>, "messages_limit": <integer >= 0> }
-- Retorna jsonb: {success:true,code:'processed'|'already_processed'} o
--   {success:false,code:'payment_not_found'|'invalid_status'|'invalid_plan_limits'}
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fulfill_payment(
  p_payment_id uuid,
  p_provider_response jsonb,
  p_plan_limits jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment billing_payments%ROWTYPE;
  v_assistants_limit integer;
  v_messages_limit integer;
BEGIN
  IF p_plan_limits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_plan_limits',
      'detail', 'p_plan_limits es NULL');
  END IF;

  IF NOT (p_plan_limits ? 'assistants_limit') THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_plan_limits',
      'detail', 'falta la clave assistants_limit');
  END IF;

  IF NOT (p_plan_limits ? 'messages_limit') THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_plan_limits',
      'detail', 'falta la clave messages_limit');
  END IF;

  IF jsonb_typeof(p_plan_limits -> 'assistants_limit') != 'number' THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_plan_limits',
      'detail', 'assistants_limit debe ser numérico');
  END IF;

  IF jsonb_typeof(p_plan_limits -> 'messages_limit') != 'number' THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_plan_limits',
      'detail', 'messages_limit debe ser numérico');
  END IF;

  v_assistants_limit := (p_plan_limits ->> 'assistants_limit')::integer;
  v_messages_limit := (p_plan_limits ->> 'messages_limit')::integer;

  IF v_assistants_limit IS NULL OR v_assistants_limit < 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_plan_limits',
      'detail', 'assistants_limit debe ser entero >= 0');
  END IF;

  IF v_messages_limit IS NULL OR v_messages_limit < 0 THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_plan_limits',
      'detail', 'messages_limit debe ser entero >= 0');
  END IF;

  SELECT * INTO v_payment FROM billing_payments WHERE id = p_payment_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'payment_not_found');
  END IF;

  IF v_payment.status != 'pending' THEN
    IF v_payment.status = 'paid' THEN
      RETURN jsonb_build_object('success', true, 'code', 'already_processed');
    END IF;
    RETURN jsonb_build_object('success', false, 'code', 'invalid_status');
  END IF;

  UPDATE billing_payments
  SET status = 'paid', raw_response = p_provider_response, updated_at = now()
  WHERE id = p_payment_id;

  -- UPSERT subscription (ON CONFLICT(user_id), apoyado en el índice único
  -- real subscriptions_user_id_key confirmado por introspección).
  INSERT INTO subscriptions (
    user_id, plan, status,
    assistants_limit, messages_limit, current_messages_used,
    current_period_start, current_period_end,
    cancel_at_period_end, cancelled_at, cancellation_reason,
    updated_at
  )
  VALUES (
    v_payment.user_id, v_payment.plan, 'active',
    v_assistants_limit, v_messages_limit, 0,
    now(), now() + interval '1 month',
    false, null, null,
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

  RETURN jsonb_build_object('success', true, 'code', 'processed');
END;
$$;

COMMENT ON FUNCTION public.fulfill_payment(uuid, jsonb, jsonb) IS
  'FASE 5.9.3. Fulfillment atómico e idempotente agnóstico de proveedor. '
  'Requiere p_plan_limits = {assistants_limit, messages_limit} validado '
  '(sin defaults silenciosos). UPSERT en subscriptions vía ON CONFLICT(user_id).';

-- ─── 1.1 PERMISOS: fulfill_payment es SECURITY DEFINER y NUEVA (no existía
-- antes de esta migración). Postgres otorga EXECUTE a PUBLIC por defecto en
-- CREATE FUNCTION, lo cual expondría esta RPC a roles authenticated/anon vía
-- PostgREST, permitiendo fulfillment arbitrario (auto-otorgarse límites de
-- plan sin pasar por Flow/checkout). Se revoca explícitamente y se otorga
-- solo a service_role (mismo rol que ya usa createSupabaseAdmin() en el
-- webhook Flow y en checkout-service.ts).
REVOKE ALL ON FUNCTION public.fulfill_payment(uuid, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulfill_payment(uuid, jsonb, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.fulfill_payment(uuid, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.fulfill_payment(uuid, jsonb, jsonb) TO service_role;

-- ─── 2. WRAPPER: fulfill_flow_payment (compatibilidad exacta) ──────────────
-- Firma y contrato de retorno IDÉNTICOS a los usados por
-- src/app/api/webhooks/flow/route.ts:97-100. No se modifica ese archivo.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fulfill_flow_payment(
  p_payment_id uuid,
  p_flow_status jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_plan_limits jsonb;
BEGIN
  SELECT plan INTO v_plan FROM billing_payments WHERE id = p_payment_id;

  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'payment_not_found');
  END IF;

  -- Mapeo alineado con src/lib/plans.ts (PLAN_CONFIGS) — ver nota de deuda
  -- técnica en el encabezado de este archivo.
  v_plan_limits := CASE v_plan
    WHEN 'starter' THEN jsonb_build_object('assistants_limit', 1, 'messages_limit', 1000)
    WHEN 'pro' THEN jsonb_build_object('assistants_limit', 3, 'messages_limit', 4000)
    WHEN 'growth' THEN jsonb_build_object('assistants_limit', 8, 'messages_limit', 10000)
    WHEN 'business' THEN jsonb_build_object('assistants_limit', 20, 'messages_limit', 20000)
    ELSE NULL
  END;

  IF v_plan_limits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'invalid_plan_limits',
      'detail', format('plan desconocido para fulfillment: %s', v_plan));
  END IF;

  RETURN public.fulfill_payment(p_payment_id, p_flow_status, v_plan_limits);
END;
$$;

COMMENT ON FUNCTION public.fulfill_flow_payment(uuid, jsonb) IS
  'FASE 5.9.3. Wrapper de compatibilidad sobre fulfill_payment. '
  'Firma y retorno idénticos al fulfillment legacy Flow. '
  'Llamado desde src/app/api/webhooks/flow/route.ts (sin cambios).';

-- ─── 3. VERIFICACIÓN POST-MIGRACIÓN (ejecutar manualmente) ─────────────────
--
-- SELECT proname, pg_get_function_identity_arguments(oid) FROM pg_proc
-- WHERE proname IN ('fulfill_payment','fulfill_flow_payment','fulfill_paypal_payment')
--   AND pronamespace = 'public'::regnamespace;
-- Esperado: 3 filas (fulfill_paypal_payment intacta, sin tocar).
--
-- SELECT proname, prosecdef, proconfig FROM pg_proc
-- WHERE proname IN ('fulfill_payment','fulfill_flow_payment')
--   AND pronamespace = 'public'::regnamespace;
-- Esperado: prosecdef=true, proconfig contiene 'search_path=public'.
--
-- SELECT public.fulfill_payment(
--   '00000000-0000-0000-0000-000000000000'::uuid, '{}'::jsonb, NULL::jsonb);
-- Esperado: {"success":false,"code":"invalid_plan_limits","detail":"p_plan_limits es NULL"}
--
-- SELECT public.fulfill_payment(
--   '00000000-0000-0000-0000-000000000000'::uuid, '{}'::jsonb, '{"assistants_limit":1}'::jsonb);
-- Esperado: {"success":false,"code":"invalid_plan_limits","detail":"falta la clave messages_limit"}
--
-- SELECT public.fulfill_payment(
--   '00000000-0000-0000-0000-000000000000'::uuid, '{}'::jsonb,
--   '{"assistants_limit":1,"messages_limit":1000}'::jsonb);
-- Esperado: {"success":false,"code":"payment_not_found"}
--
-- SELECT public.fulfill_flow_payment(
--   '00000000-0000-0000-0000-000000000000'::uuid, '{}'::jsonb);
-- Esperado: {"success":false,"code":"payment_not_found"}
--
-- SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges
-- WHERE routine_name = 'fulfill_payment';
-- Esperado: única fila con grantee=service_role, privilege_type=EXECUTE
-- (ninguna fila con grantee IN ('PUBLIC','authenticated','anon')).
--
-- ROLLBACK (solo emergencia): restaurar el cuerpo comentado en
-- 20260921000000_document_billing_schema.sql líneas 157-195 vía
-- CREATE OR REPLACE FUNCTION public.fulfill_flow_payment(...);
-- DROP FUNCTION IF EXISTS public.fulfill_payment(uuid, jsonb, jsonb);
-- (el DROP elimina también sus GRANT/REVOKE; no se requieren pasos extra.
-- fulfill_paypal_payment nunca se modificó, no requiere rollback).
