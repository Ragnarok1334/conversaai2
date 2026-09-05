# ConversaAI — Security Audit

## Propósito

Este documento conserva el registro técnico de la auditoría de seguridad de ConversaAI para que el estado no dependa del historial de una conversación de ChatGPT. Debe actualizarse junto con cada corrección relevante.

## Alcance

Se revisan autenticación, autorización, aislamiento multi-tenant, RLS, funciones `SECURITY DEFINER`, validación de entradas, rate limiting, abuso de recursos, concurrencia, idempotencia, billing, webhooks, exposición de información, IA, herramientas futuras, dependencias y seguridad del navegador.

## Principios de seguridad adoptados

1. El servidor determina la identidad y el tenant; nunca se confía en IDs de propietario enviados por el cliente.
2. RLS es una segunda barrera, no un sustituto de la autorización de aplicación.
3. `service_role` evita RLS y por ello cada consulta server-side debe aplicar autorización explícita.
4. Los modelos de IA no autorizan acciones. Cualquier herramienta futura tendrá un gateway server-side independiente.
5. Origin/Referer/pageUrl y otros headers del navegador son señales anti-abuso, no autenticación.
6. Los eventos externos deben autenticarse y procesarse de forma atómica e idempotente.
7. Todo input controlado por usuario debe tener esquema, límites de tamaño y cardinalidad adecuados.
8. Los errores y logs no deben revelar secretos, PII innecesaria ni detalles internos.
9. Ninguna corrección se considera cerrada sin verificación y revisión de regresión.

## Registro de hallazgos y correcciones

### FLOW-001 — Fulfillment no atómico

- **Severidad:** Alta
- **Área:** Billing / Flow
- **Estado:** CERRADO
- **Impacto:** Riesgo de estados inconsistentes entre pago y suscripción, además de problemas de repetición de webhook.
- **Corrección:** Se implementó `fulfill_flow_payment(...)` como operación atómica/idempotente en Supabase.
- **Commit:** `6dc8585fc57b454107fd811f8402f0a29fc631e0`
- **Verificación:** El flujo fue revisado posteriormente y marcado en verde.

### FLOW-002 — Endpoint de status con mutación

- **Severidad:** Media/Alta
- **Área:** `/api/billing/flow/status`
- **Estado:** CERRADO
- **Corrección:** Endpoint convertido a lectura.
- **Commit:** `32c451f400e63e618e83e67daa02f834cc6c03dc`

### FLOW-003 — Token de retorno en historial del navegador

- **Severidad:** Media
- **Área:** Flow return
- **Estado:** CERRADO
- **Corrección:** Eliminación del token del historial después del retorno.
- **Commit:** `961bf374b5722cd89e5c7e0645f47d3b27a9c51a`

### FLOW-004 — Header Referer innecesario

- **Severidad:** Baja/Media
- **Área:** Flow return
- **Estado:** CERRADO
- **Corrección:** Eliminado header de cliente innecesario.
- **Commit:** `ba4a0d121fb57629f42cb4e28327ffa997812d0b`

### ASSIST-001 — Validación insuficiente de configuración

- **Severidad:** Media
- **Área:** `/api/assistants`
- **Estado:** PENDIENTE
- **Riesgo:** `faqs`, `services`, `schedule`, `channels`, `behavior` y otros bloques aceptan estructuras/tamaños más amplios de lo deseable.
- **Acción:** Introducir esquemas estrictos y límites de tamaño/profundidad/cardinalidad.

### ASSIST-002 — Body y rate limiting

- **Severidad:** Media
- **Área:** `/api/assistants`
- **Estado:** PENDIENTE
- **Riesgo:** Falta de límite de body y rate limiting visible uniforme.

### ASSIST-003 — `select('*')` y fallback de INSERT

- **Severidad:** Media
- **Área:** `/api/assistants`
- **Estado:** PENDIENTE
- **Riesgo:** Futuros campos internos podrían terminar en respuestas; fallback silencioso puede ocultar errores de esquema.

### DB-001 — RLS general

- **Severidad:** Alta como control estructural
- **Área:** Supabase
- **Estado:** CERRADO
- **Resultado:** Las tablas públicas auditadas tienen RLS habilitado y las políticas principales respetan ownership.

### DB-002 — Funciones `SECURITY DEFINER`

- **Severidad:** Alta como control estructural
- **Área:** Supabase RPC
- **Estado:** CERRADO con revisión continua
- **Resultado:** Las funciones críticas auditadas tienen `search_path` fijado y ejecución restringida cuando corresponde.
- **Nota:** Los argumentos de límites entregados por callers confiables siguen requiriendo revisión en cada uso.

### DB-003 — Consistencia de `messages` con `conversations`

- **Severidad:** Alta
- **Área:** Base de datos
- **Estado:** PENDIENTE
- **Riesgo:** La DB no impone que `messages.user_id`, `messages.assistant_id` y `messages.channel` coincidan con su conversación. Los escritores con `service_role` deben garantizarlo hasta incorporar una barrera DB segura.
- **Acción:** Mantener mapa de escritores y evaluar constraints/RPC tras completar la revisión.

### CONV-001 — Enumeración/aislamiento de conversaciones

- **Severidad:** Alta
- **Área:** `/api/conversations`
- **Estado:** PENDIENTE
- **Resultado actual:** Las consultas principales filtran por `user_id`.
- **Pendientes:** paginación acotada, DTO explícito, búsqueda segura, estadísticas agregadas y rate limiting.

### CONV-002 — Mensajes sin paginación

- **Severidad:** Media
- **Área:** `/api/conversations/[id]`
- **Estado:** PENDIENTE
- **Riesgo:** Un usuario con muchas conversaciones/mensajes puede provocar respuestas grandes y consumo excesivo.

### WIDGET-001 — Reutilización de `conversationId` de otro visitante

- **Severidad:** Crítica
- **Área:** `/api/widget/message`
- **Estado:** CORREGIDO — PENDIENTE DE VERIFICACIÓN/DEPLOY
- **Causa:** El endpoint original validaba `conversationId` por assistant pero no lo vinculaba al visitante.
- **Impacto:** Un atacante con un ID de conversación podía intentar escribir en la conversación de otro visitante del mismo asistente.
- **Corrección:** La conversación existente solo se reutiliza si coinciden simultáneamente `id`, `assistant_id`, `user_id`, `channel=webchat` y `visitor_id`. Si no coincide, se crea una conversación nueva sin revelar la existencia de la anterior.
- **Commit:** `4952fbba8d54cb530057e5c244e76879503d44ec`
- **Blob actual:** `ab5db9d4bf97f9882181ecadba34dcce18eaab3f`
- **Rama:** `security/widget-isolation`

### WIDGET-002 — IDs y body insuficientemente validados

- **Severidad:** Media
- **Área:** `/api/widget/message`
- **Estado:** CORREGIDO — PENDIENTE DE VERIFICACIÓN
- **Corrección:** Validación de UUID, `visitorId`, message y `Content-Length`; body debe ser objeto JSON y el mensaje está limitado a 1000 caracteres.
- **Commit:** `4952fbba8d54cb530057e5c244e76879503d44ec`

### WIDGET-003 — Errores de persistencia ignorados

- **Severidad:** Alta
- **Área:** `/api/widget/message`
- **Estado:** CORREGIDO — PENDIENTE DE VERIFICACIÓN
- **Corrección:** Los INSERT de mensaje de usuario y asistente ahora comprueban errores y fallan cerrados.
- **Commit:** `4952fbba8d54cb530057e5c244e76879503d44ec`

### WIDGET-004 — Consumo de crédito antes de completar operación

- **Severidad:** Alta
- **Área:** `/api/widget/message`
- **Estado:** PENDIENTE
- **Riesgo:** Una solicitud puede consumir un mensaje y posteriormente fallar al persistir/generar la respuesta.
- **Acción:** Diseñar refund seguro y limitado para fallos controlados; evitar doble devolución.

### WIDGET-005 — Falta de idempotencia

- **Severidad:** Alta
- **Área:** `/api/widget/message`
- **Estado:** PENDIENTE
- **Riesgo:** Reintentos de red pueden duplicar consumo, generación de IA, mensajes y leads.
- **Acción:** Diseñar una clave idempotente vinculada al visitante/conversación y procesarla de forma atómica.

### WIDGET-006 — IP derivada directamente de `x-forwarded-for`

- **Severidad:** Media
- **Área:** Rate limiting
- **Estado:** PENDIENTE
- **Riesgo:** El header puede ser manipulable fuera de una cadena de proxy confiable y también puede producir claves anormalmente grandes.

### WIDGET-007 — Controles de coste de IA

- **Severidad:** Alta
- **Área:** Web Chat / OpenAI
- **Estado:** PENDIENTE
- **Riesgo:** Mensajes/reintentos/configuración pueden aumentar coste y latencia.
- **Acción:** Presupuestos de tokens, límites de contexto, output máximo, timeout y rate limiting coordinados.

### WIDGET-008 — Contador de instalaciones con race condition

- **Severidad:** Media
- **Área:** `/api/widget/ping`
- **Estado:** PENDIENTE
- **Causa:** Lectura → incremento → UPDATE manual no es atómico.
- **Acción:** Usar la operación atómica `record_widget_install_event(...)` después de verificar compatibilidad exacta.

### LEAD-001 — `assistant_id` confiado desde el cliente

- **Severidad:** Alta
- **Área:** `/api/leads/convert`
- **Estado:** PENDIENTE
- **Riesgo:** Posibilidad de inconsistencias/cross-tenant si el assistant enviado por cliente no coincide con la conversación.
- **Corrección prevista:** Derivar `assistant_id` desde la conversación autorizada.

### LEAD-002 — Filtros PostgREST interpolados

- **Severidad:** Media
- **Área:** Leads
- **Estado:** PENDIENTE
- **Riesgo:** Input no escapado puede producir errores, filtros inesperados o abuso de recursos.

### TRIAL-001 — Race condition al iniciar trial

- **Severidad:** Alta
- **Área:** `/api/billing/trial/start`
- **Estado:** PENDIENTE
- **Riesgo:** Solicitudes concurrentes pueden iniciar múltiples trials o interferir con una suscripción de pago.
- **Acción:** Revisar y usar una operación atómica adecuada.

### DOMAIN-001 — Límite de dominios susceptible a carrera

- **Severidad:** Media/Alta
- **Área:** Assistant domains
- **Estado:** PENDIENTE
- **Riesgo:** COUNT → check → INSERT concurrente puede superar el límite.
- **Acción:** Usar/revisar `add_assistant_domain_atomic(...)`.

### TELEGRAM-001 — Webhook fail-open sin secret configurado

- **Severidad:** Alta
- **Área:** Telegram webhook
- **Estado:** PENDIENTE
- **Riesgo:** La ausencia de configuración no debería convertir el endpoint en una superficie pública aceptante.

### TELEGRAM-002 — Secretos en query string

- **Severidad:** Alta
- **Área:** Telegram setup
- **Estado:** PENDIENTE
- **Riesgo:** URLs pueden filtrarse por logs, historial, proxies y analytics.

### TELEGRAM-003 — Dedupe y coste de IA

- **Severidad:** Media/Alta
- **Área:** Telegram
- **Estado:** PENDIENTE
- **Acción:** Dedupe por `update_id`, límites de coste/tiempo y control de reintentos.

### AI-001 — Input/contexto sin presupuesto fuerte

- **Severidad:** Alta
- **Área:** IA
- **Estado:** PENDIENTE
- **Acción:** Limitar entrada, contexto, knowledge blocks y output; aplicar timeout/cancelación.

### AI-002 — Prompt injection / contenido no confiable

- **Severidad:** Alta
- **Área:** `buildPrompt.ts`
- **Estado:** PENDIENTE
- **Principio:** Configuración del tenant y contenido externo son datos no confiables. Nunca deben saltarse la jerarquía de instrucciones ni autorizar herramientas.

### AI-003 — Tool authorization futura

- **Severidad:** Crítica potencial
- **Área:** Arquitectura IA
- **Estado:** PENDIENTE
- **Requisito:** Gateway server-side que valide tenant, usuario, rol, plan, argumentos, límites y rate limit independientemente del modelo.

### AUTH-001 — OAuth redirect / `x-forwarded-host`

- **Severidad:** Media/Alta
- **Área:** `/api/auth/callback`
- **Estado:** PENDIENTE
- **Riesgo:** Confianza excesiva en host enviado por proxy y validación de `next`.

### AUTH-002 — Errores y persistencia de onboarding

- **Severidad:** Media
- **Área:** Auth
- **Estado:** PENDIENTE
- **Riesgo:** Errores de creación de profile/subscription se silencian.

### API-001 — Endpoints sensibles sin límites uniformes

- **Severidad:** Media
- **Área:** API general
- **Estado:** PENDIENTE
- **Acción:** Normalizar schemas, body limits, rate limits y paginación.

### OBS-001 — Logs con PII/errores innecesarios

- **Severidad:** Media
- **Área:** Observabilidad
- **Estado:** PENDIENTE
- **Acción:** Minimizar emails/IPs/URLs y evitar errores crudos en logs o respuestas.

### DEP-001 — Next.js desactualizado

- **Severidad:** Crítica/Alta según advisory aplicable
- **Área:** Dependencias
- **Estado:** PENDIENTE
- **Versión auditada:** `next 16.2.6`
- **Acción:** Actualizar a una versión corregida compatible con el proyecto y revisar lockfile/transitivas de React Server Components.
- **Nota:** La actualización debe verificarse con build, tests y regresión antes de cerrar.

### BROWSER-001 — CSP

- **Severidad:** Media
- **Área:** `next.config.ts`
- **Estado:** PENDIENTE
- **Resultado actual:** HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy y X-Frame-Options están presentes.
- **Acción:** Evaluar CSP compatible con la aplicación y el widget sin romper integraciones.

### BROWSER-002 — `public/test.html`

- **Severidad:** Baja/Media
- **Área:** Assets públicos
- **Estado:** PENDIENTE
- **Acción:** Eliminar o proteger si no es necesario en producción.

## Historial de commits de seguridad relevantes

| Commit | Cambio |
|---|---|
| `6dc8585fc57b454107fd811f8402f0a29fc631e0` | Flow fulfillment atómico/idempotente |
| `32c451f400e63e618e83e67daa02f834cc6c03dc` | Flow status read-only |
| `961bf374b5722cd89e5c7e0645f47d3b27a9c51a` | Eliminación de token de Flow del historial |
| `ba4a0d121fb57629f42cb4e28327ffa997812d0b` | Eliminación de Referer innecesario |
| `4952fbba8d54cb530057e5c244e76879503d44ec` | Endurecimiento inicial de aislamiento del Widget |
| `32b95ee2d90ee1a1edbf9a57dc65fb96901b535b` | Este registro de progreso |

## Criterio de cierre

Un hallazgo solo se marca `CERRADO` cuando la corrección está aplicada, el comportamiento esperado fue verificado, las rutas relacionadas fueron revisadas y no existe una dependencia crítica pendiente que invalide el cierre.

## Próxima secuencia de trabajo

1. Verificar exhaustivamente el cambio `WIDGET-001`.
2. Resolver refund/idempotencia del widget.
3. Hacer atómico `/api/widget/ping`.
4. Corregir `/api/leads/convert`.
5. Corregir trial y assistant domains.
6. Completar Telegram.
7. Endurecer IA y controles de coste.
8. Actualizar dependencias críticas.
9. Ejecutar auditoría de regresión completa.
