-- ════════════════════════════════════════════════════════════════════════════
-- FASE 5.1: PAYMENT CORE — Preparación multi-provider (sin romper Flow)
-- ════════════════════════════════════════════════════════════════════════════
-- PROPÓSITO: Preparar billing_payments para soportar Flow + Webpay + Khipu + PayPal
--            sin cambios breaking en código actual.
--
-- ALCANCE: Solo DDL aditivo + backfill idempotente + índices parciales.
--          NO crea adapters, checkout nuevo ni webhook nuevo.
--
-- COMPATIBILIDAD: 100% backward compatible con:
--   - flow/checkout/route.ts (INSERT flow_token, flow_order)
--   - webhooks/flow/route.ts (SELECT WHERE flow_token = token, rpc fulfill_flow_payment)
--   - flow/status/route.ts (SELECT flow_token)
--   - payments/route.ts (SELECT flow_order)
--   - RPC fulfill_flow_payment(uuid, jsonb)
--
-- SEGURIDAD: Todo ADD COLUMN es NULLABLE (no rewrite bloqueante).
--            Índices parciales WHERE NOT NULL (no afectan filas existentes).
--            Backfill idempotente (WHERE ... IS NULL).
--            Columnas legacy NO se eliminan.
--
-- APLICACIÓN: supabase db push (transacción única).
-- FECHA: 2026-09-22
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. COLUMNAS GENÉRICAS ─────────────────────────────────────────────────
-- provider_order_id : orden agnóstica (commerceOrder/buyOrder/paymentId/orderId)
-- provider_token    : token agnóstico para lookup webhook/status
-- provider_event_id : deduplicación webhook (event_id/notification_id)
-- idempotency_key   : deduplicar retries checkout (UNIQUE WHERE NOT NULL)
-- expires_at        : expiración pending para cron limpieza

ALTER TABLE public.billing_payments
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS provider_token text,
  ADD COLUMN IF NOT EXISTS provider_event_id text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

COMMENT ON COLUMN public.billing_payments.provider_order_id IS
  'ID orden agnóstico provider. Flow=commerceOrder, Webpay=buyOrder, Khipu=paymentId, PayPal=orderId.';
COMMENT ON COLUMN public.billing_payments.provider_token IS
  'Token agnóstico para lookup webhook/status. Flow=flow_token, Webpay=token_ws, Khipu=payment_id.';
COMMENT ON COLUMN public.billing_payments.provider_event_id IS
  'ID evento webhook para deduplicación. Flow=token, Khipu=notification_id, PayPal=event_id.';
COMMENT ON COLUMN public.billing_payments.idempotency_key IS
  'Clave idempotencia checkout (UUID). UNIQUE WHERE NOT NULL. Retry seguro sin duplicar.';
COMMENT ON COLUMN public.billing_payments.expires_at IS
  'Expiración intento pending. Job limpieza marca expired tras 30min sin webhook.';

-- ─── 2. ÍNDICES ÚNICOS PARCIALES ───────────────────────────────────────────
-- UNIQUE(provider, provider_token): evita duplicar token de provider (replay webhook)
-- UNIQUE(idempotency_key): deduplica retries checkout
-- Ambos son parciales WHERE NOT NULL → cero overhead en filas legacy NULL

CREATE UNIQUE INDEX IF NOT EXISTS idx_bp_provider_token_unique
  ON public.billing_payments (provider, provider_token)
  WHERE provider_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bp_idempotency_key_unique
  ON public.billing_payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Índice para limpieza por expiración
CREATE INDEX IF NOT EXISTS idx_bp_expires_at
  ON public.billing_payments (expires_at)
  WHERE expires_at IS NOT NULL;

-- ─── 3. BACKFILL IDEMPOTENTE ───────────────────────────────────────────────
-- Flow: provider_order_id ← flow_order, provider_token ← flow_token
-- PayPal: provider_token ← paypal_order_id
-- Condiciones IS NULL garantizan re-ejecución segura

UPDATE public.billing_payments
SET provider_order_id = flow_order
WHERE provider = 'flow'
  AND provider_order_id IS NULL
  AND flow_order IS NOT NULL;

UPDATE public.billing_payments
SET provider_token = flow_token
WHERE provider = 'flow'
  AND provider_token IS NULL
  AND flow_token IS NOT NULL;

UPDATE public.billing_payments
SET provider_token = paypal_order_id
WHERE provider = 'paypal'
  AND provider_token IS NULL
  AND paypal_order_id IS NOT NULL;

-- provider_event_id e idempotency_key: sin fuente legacy, se poblan en nuevos checkouts
-- expires_at: se pobla en nuevos checkouts (now() + interval '30 minutes')

-- ─── 4. VERIFICACIÓN POST-MIGRACIÓN ────────────────────────────────────────
-- Ejecutar manualmente tras supabase db push:
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name='billing_payments'
--   AND column_name IN ('provider_order_id','provider_token','provider_event_id','idempotency_key','expires_at');
-- Resultado esperado: 5 filas, todas is_nullable=YES
--
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename='billing_payments'
--   AND indexname LIKE 'idx_bp_%';
-- Resultado esperado: 3 índices
--
-- SELECT count(*) AS total,
--        count(provider_token) AS con_provider_token,
--        count(provider_order_id) AS con_provider_order
-- FROM billing_payments WHERE provider='flow';
-- Resultado: con_provider_token = con_provider_order = count(*) para filas Flow
--
-- ROLLBACK (solo emergencia):
-- DROP INDEX IF EXISTS idx_bp_provider_token_unique;
-- DROP INDEX IF EXISTS idx_bp_idempotency_key_unique;
-- DROP INDEX IF EXISTS idx_bp_expires_at;
-- ALTER TABLE billing_payments
--   DROP COLUMN IF EXISTS provider_order_id,
--   DROP COLUMN IF EXISTS provider_token,
--   DROP COLUMN IF EXISTS provider_event_id,
--   DROP COLUMN IF EXISTS idempotency_key,
--   DROP COLUMN IF EXISTS expires_at;