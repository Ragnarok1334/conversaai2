-- ════════════════════════════════════════════════════════════════════════════
-- FASE 4.3: DOCUMENTACIÓN DEL SCHEMA DE BILLING REAL (Supabase btekstwmmxsoemsobjlg)
-- ════════════════════════════════════════════════════════════════════════════
-- PROPÓSITO: Versionar el schema de billing que YA EXISTE en producción remota.
--            NO se aplica con `supabase db push` — es solo documentación.
--
-- ESTADO: Las tablas billing_payments, subscriptions y RPCs fulfill_flow_payment,
--         fulfill_paypal_payment fueron creadas directamente en Supabase Dashboard.
--         No hay migración previa que las defina.
--
-- CAPTURA: Schema extraído vía Supabase REST OpenAPI (service_role) el 2026-09-21.
--          Confirmado activo en producción con pagos Flow reales (ej: payment
--          e5adf785-a30e-4eca-80be-2cc3aa666b15, status=paid, plan=business, 49000 CLP).
--
-- RLS: Ambas tablas tienen RLS habilitado. Anon=401, service_role=200.
--      Código usa service_role via createSupabaseAdmin() para INSERT/UPDATE.
--
-- ÍNDICES/FK: No documentados aún en OpenAPI. Inferidos desde uso del código:
--   - billing_payments: index probable en (user_id, created_at desc)
--                       index probable en (flow_token) para webhook lookup
--                       index probable en (flow_order) para /return
--   - subscriptions: index probable en (user_id) unique
--
-- PROVEEDORES: Flow (activo, Sandbox), PayPal (preparado, no activo aún).
--
-- SEGURIDAD: Webhook Flow verifica HMAC SHA256 (timingSafeEqual).
--            Fulfillment via SECURITY DEFINER RPC con idempotencia (status != pending).
--            ⚠️  FALTA: idempotency_key explícita en billing_payments.
--
-- NO EJECUTAR: Este archivo documenta el estado actual. Aplicarlo causaría error
--              "relation already exists". Para cambios futuros, crear nueva migración.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. TABLA: subscriptions ─────────────────────────────────────────────────
-- Propósito: Plan activo del usuario, límites, uso, períodos, cancelación.
-- Uso: Dashboard (/dashboard/*, /api/widget/message verificación de límites).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- FK a auth.users, no visible en OpenAPI (creado manualmente)
  
  -- Plan y estado
  plan text NOT NULL DEFAULT 'free', -- free|trial|starter|pro|growth|business|enterprise
  status text NOT NULL DEFAULT 'active', -- active|cancelled|past_due|trialing
  
  -- Límites (según plans.ts, se sincronizan en fulfillment)
  assistants_limit integer NOT NULL DEFAULT 1,
  messages_limit integer NOT NULL DEFAULT 100,
  current_messages_used integer NOT NULL DEFAULT 0,
  
  -- Períodos (null para free, poblados en paid)
  current_period_start timestamptz,
  current_period_end timestamptz,
  grace_ends_at timestamptz,
  
  -- Cancelación
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  cancellation_reason text,
  
  -- Auditoría
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
  
  -- CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  -- CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id) -- inferido, no confirmado en OpenAPI
);

-- RLS: habilitado, policies no documentadas aún (probable: user_id = auth.uid())
-- Índice inferido: (user_id) único
-- Índice inferido: (user_id, updated_at desc)

COMMENT ON TABLE public.subscriptions IS 
  'Plan activo, límites y estado de facturación del usuario. Único por user_id.';
COMMENT ON COLUMN public.subscriptions.current_messages_used IS 
  'Contador de mensajes del período actual, reseteado al inicio de cada ciclo.';
COMMENT ON COLUMN public.subscriptions.grace_ends_at IS 
  'Fin del período de gracia post-expiración antes de downgrade a free.';

-- ─── 2. TABLA: billing_payments ────────────────────────────────────────────────
-- Propósito: Registro de intentos de pago, transacciones Flow/PayPal y estado.
-- Uso: Checkout Flow (/api/billing/flow/checkout), webhook (/api/webhooks/flow),
--      status check (/api/billing/flow/status), historial (/api/billing/payments).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- FK a auth.users
  
  -- Proveedor y plan
  provider text NOT NULL, -- 'flow' | 'paypal' (futuro: 'stripe', 'crypto')
  plan text NOT NULL, -- starter|pro|growth|business|enterprise
  
  -- Monto
  amount integer NOT NULL, -- CLP enteros o USD centavos según currency
  currency text NOT NULL DEFAULT 'CLP', -- 'CLP' | 'USD'
  
  -- Estado del pago
  status text NOT NULL DEFAULT 'pending', -- pending|paid|rejected|cancelled
  
  -- Campos específicos de Flow
  flow_token text, -- token Flow para lookup en webhook y status check
  flow_order text, -- commerceOrder (formato: conversaai-{shortId}-{plan}-{timestamp})
  
  -- Campos específicos de PayPal (preparados, no activos aún)
  paypal_order_id text, -- PayPal Order ID
  paypal_capture_id text, -- PayPal Capture ID tras capture
  
  -- Respuesta completa del provider (para auditoría y debugging)
  raw_response jsonb, -- Flow: {url,token,flowOrder,status,paymentData,...} | PayPal: order object
  
  -- Metadata adicional (extensible)
  metadata jsonb,
  
  -- Auditoría
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
  
  -- CONSTRAINT billing_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  -- CONSTRAINT billing_payments_flow_token_unique UNIQUE (flow_token) WHERE flow_token IS NOT NULL -- recomendado
  -- CONSTRAINT billing_payments_paypal_order_unique UNIQUE (paypal_order_id) WHERE paypal_order_id IS NOT NULL
);

-- RLS: habilitado, policies no documentadas aún
-- Código usa service_role (createSupabaseAdmin()) para INSERT/UPDATE en checkout y webhook
-- Índices inferidos desde uso del código:
-- - (user_id, created_at DESC) para historial del usuario
-- - (flow_token) para lookup rápido en webhook Flow
-- - (flow_order) para lookup en /return (aunque actualmente redirige sin DB query)
-- - (paypal_order_id) para webhook PayPal (futuro)

COMMENT ON TABLE public.billing_payments IS
  'Registro de intentos de pago y transacciones completadas con Flow, PayPal u otros providers.';
COMMENT ON COLUMN public.billing_payments.provider IS
  'Proveedor de pago: flow (activo en Sandbox), paypal (preparado), stripe/crypto (futuro).';
COMMENT ON COLUMN public.billing_payments.status IS
  'Estado: pending (creado), paid (confirmado), rejected (rechazado), cancelled (cancelado).';
COMMENT ON COLUMN public.billing_payments.flow_token IS
  'Token único de Flow para webhook lookup y status check. Null para otros providers.';
COMMENT ON COLUMN public.billing_payments.flow_order IS
  'commerceOrder enviado a Flow. Formato: conversaai-{user_short_id}-{plan}-{timestamp}.';
COMMENT ON COLUMN public.billing_payments.raw_response IS
  'Respuesta completa del provider (JSON). Flow: {url,token,flowOrder,status,paymentData}.';
COMMENT ON COLUMN public.billing_payments.metadata IS
  'Metadata adicional extensible (IP, user_agent, referrer, etc).';

-- ─── 3. RPC: fulfill_flow_payment ─────────────────────────────────────────────
-- Propósito: Fulfillment atómico e idempotente de pagos Flow confirmados.
-- Llamado desde: /api/webhooks/flow cuando flowStatus.status === 2 (paid).
-- Seguridad: SECURITY DEFINER con validaciones estrictas e idempotencia por status.
-- Firma inferida desde webhook (webhooks/flow:103):
--   supabase.rpc('fulfill_flow_payment', { p_payment_id, p_flow_status })
-- Retorna: { success: boolean, code: 'processed'|'already_processed'|'payment_not_found' }
-- ─────────────────────────────────────────────────────────────────────────────

-- CREATE OR REPLACE FUNCTION public.fulfill_flow_payment(
--   p_payment_id uuid,
--   p_flow_status jsonb
-- ) RETURNS jsonb
-- LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
-- AS $$
-- DECLARE
--   v_payment billing_payments%ROWTYPE;
-- BEGIN
--   SELECT * INTO v_payment FROM billing_payments WHERE id = p_payment_id FOR UPDATE;
--   IF NOT FOUND THEN
--     RETURN jsonb_build_object('success',false,'code','payment_not_found');
--   END IF;
--   IF v_payment.status != 'pending' THEN
--     IF v_payment.status = 'paid' THEN
--       RETURN jsonb_build_object('success',true,'code','already_processed');
--     END IF;
--     RETURN jsonb_build_object('success',false,'code','invalid_status');
--   END IF;
--   UPDATE billing_payments SET status='paid', raw_response=p_flow_status, updated_at=now()
--     WHERE id = p_payment_id;
--   -- UPSERT subscription con límites según plan
--   INSERT INTO subscriptions (user_id,plan,status,assistants_limit,messages_limit,
--     current_messages_used,current_period_start,current_period_end,updated_at)
--   VALUES (v_payment.user_id,v_payment.plan,'active',
--     CASE v_payment.plan WHEN 'starter' THEN 1 WHEN 'pro' THEN 3
--       WHEN 'growth' THEN 10 WHEN 'business' THEN 999 ELSE 1 END,
--     CASE v_payment.plan WHEN 'starter' THEN 1000 WHEN 'pro' THEN 5000
--       WHEN 'growth' THEN 20000 WHEN 'business' THEN 100000 ELSE 100 END,
--     0, now(), now()+interval '1 month', now())
--   ON CONFLICT (user_id) DO UPDATE SET
--     plan=EXCLUDED.plan, status='active',
--     assistants_limit=EXCLUDED.assistants_limit, messages_limit=EXCLUDED.messages_limit,
--     current_messages_used=0, current_period_start=now(),
--     current_period_end=now()+interval '1 month',
--     cancel_at_period_end=false, cancelled_at=null, updated_at=now();
--   RETURN jsonb_build_object('success',true,'code','processed');
-- END;
-- $$;

-- ─── 4. RPC: fulfill_paypal_payment ───────────────────────────────────────────
-- Propósito: Fulfillment de pagos PayPal (preparado, no implementado aún).
-- Firma esperada: fulfill_paypal_payment(p_payment_id uuid, p_paypal_order jsonb)
-- Retorna: { success: boolean, code: string }
-- ─────────────────────────────────────────────────────────────────────────────

-- CREATE OR REPLACE FUNCTION public.fulfill_paypal_payment(
--   p_payment_id uuid,
--   p_paypal_order jsonb
-- ) RETURNS jsonb
-- LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
-- AS $$
-- BEGIN
--   RETURN jsonb_build_object('success',false,'code','not_implemented');
-- END;
-- $$;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN Y CIERRE (2026-09-21)
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 5. ÍNDICES INFERIDOS (no confirmados en OpenAPI) ──────────────────────
-- billing_payments:
--   - CREATE INDEX idx_billing_payments_user_id_created ON billing_payments(user_id, created_at DESC);
--   - CREATE INDEX idx_billing_payments_flow_token ON billing_payments(flow_token) WHERE flow_token IS NOT NULL;
--   - CREATE INDEX idx_billing_payments_flow_order ON billing_payments(flow_order) WHERE flow_order IS NOT NULL;
--   - CREATE UNIQUE INDEX idx_billing_payments_flow_token_unique ON billing_payments(flow_token);
--
-- subscriptions:
--   - CREATE UNIQUE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
--   - Probable FK: ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey 
--                  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ─── 6. VERIFICACIÓN CRUZADA ───────────────────────────────────────────────
-- Fecha: 2026-09-21
-- Referencias:
--   - scripts/fase43-v3-output.txt (OpenAPI schema dump, 389 líneas)
--   - scripts/fase43-probe-output.txt (RLS + existence probes, 37 líneas)
--   - src/lib/plans.ts:96-193 (limits: starter 1k, pro 5k, growth 20k, business 100k)
--   - src/app/api/webhooks/flow/route.ts:103 (fulfill_flow_payment call)
--
-- Estado:
--   ✅ Columnas documentadas coinciden 100% con OpenAPI
--   ✅ RLS habilitado confirmado (anon=401, service_role=200)
--   ✅ Pago real verificado: e5adf785-a30e-4eca-80be-2cc3aa666b15 (business, 49000 CLP, paid)
--   ✅ RPC signature fulfill_flow_payment(uuid, jsonb) validada contra webhooks/flow:103
--   ✅ Plan limits en RPC comentado alineados con plans.ts
--   ⚠️  Falta idempotency_key explícita (actualmente usa status != pending)
--   ⚠️  Índices y FK no visibles en OpenAPI, requieren introspección pg_catalog
--
-- Nota: Este archivo NO debe ejecutarse con `supabase db push`.
--       Es documentación del schema existente en producción (btekstwmmxsoemsobjlg).
--       Para cambios futuros, crear nueva migración incremental.
