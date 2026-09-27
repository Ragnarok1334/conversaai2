BEGIN;


-- =====================================================
-- LOCK DOWN INTERNAL RUNTIME TABLES
-- ConversaAI Security Hardening
-- =====================================================


-- -----------------------------------------------------
-- api_rate_limits
-- Solo usada por RPC/backend
-- -----------------------------------------------------

REVOKE ALL ON TABLE public.api_rate_limits
FROM anon, authenticated;


GRANT ALL ON TABLE public.api_rate_limits
TO service_role;



-- -----------------------------------------------------
-- security_events
-- Contiene IP, user agent, eventos de seguridad
-- Nunca debe ser visible al cliente
-- -----------------------------------------------------

REVOKE ALL ON TABLE public.security_events
FROM anon, authenticated;


GRANT ALL ON TABLE public.security_events
TO service_role;



-- -----------------------------------------------------
-- paypal_webhook_events
-- Idempotencia interna de webhooks
-- -----------------------------------------------------

REVOKE ALL ON TABLE public.paypal_webhook_events
FROM anon, authenticated;


GRANT ALL ON TABLE public.paypal_webhook_events
TO service_role;



-- -----------------------------------------------------
-- widget_message_requests
-- Cola interna del widget
-- Acceso solo backend
-- -----------------------------------------------------

REVOKE ALL ON TABLE public.widget_message_requests
FROM anon, authenticated;


GRANT ALL ON TABLE public.widget_message_requests
TO service_role;



-- Asegurar RLS activo

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_message_requests ENABLE ROW LEVEL SECURITY;


COMMIT;