# ConversaAI — Security Progress

Última actualización: 2026-09-05

## Estados

- `PENDIENTE`: identificado, sin corrección aplicada.
- `EN PROGRESO`: se está trabajando.
- `CORREGIDO`: cambio aplicado, pendiente de verificación/deploy.
- `VERIFICADO`: probado técnicamente, sin regresiones conocidas.
- `CERRADO`: verificado y no quedan acciones relevantes para ese módulo.

## Estado maestro

### Autenticación y autorización

- [CERRADO] Protección general de rutas autenticadas.
- [CERRADO] Aislamiento básico de asistentes por `user_id`.
- [PENDIENTE] Endurecimiento final de validación de payloads en `/api/assistants`.
- [PENDIENTE] Revisión final de redirects/OAuth y límites de entrada.

### Supabase / RLS

- [CERRADO] RLS habilitado en las tablas públicas auditadas.
- [CERRADO] Políticas de ownership principales revisadas.
- [CERRADO] Funciones `SECURITY DEFINER` críticas con `search_path` fijado y ejecución restringida.
- [PENDIENTE] Consistencia DB entre `messages` y `conversations` (`user_id`, `assistant_id`, `channel`) tras completar el mapa de escritores.
- [PENDIENTE] Revisar triggers duplicados de `conversations` antes de cualquier limpieza.

### Billing / Flow

- [CERRADO] Fulfillment Flow atómico e idempotente.
- [CERRADO] `/api/billing/flow/status` convertido a lectura.
- [CERRADO] Token de Flow retirado del historial del navegador tras el retorno.
- [CERRADO] Header de Referer innecesario eliminado del flujo de retorno.

### Widget

- [CORREGIDO] Aislamiento de `conversationId`: ahora requiere `assistant_id`, `user_id`, `channel=webchat` y `visitor_id` coincidentes.
- [CORREGIDO] Validación de UUID, `visitorId` y tamaño básico del body.
- [CORREGIDO] Owner del asistente derivado server-side.
- [CORREGIDO] Errores de persistencia de mensajes ya no se ignoran.
- [PENDIENTE] Reembolso seguro de crédito cuando una solicitud consumida falla antes de producir una respuesta válida.
- [PENDIENTE] Idempotencia de solicitudes para evitar doble consumo + doble generación de IA.
- [PENDIENTE] Revisión de límites de coste/tokens/timeout del modelo en Web Chat.
- [PENDIENTE] Endurecer extracción de IP y confianza en `x-forwarded-for`.
- [PENDIENTE] Revisar y endurecer `visitorId` del cliente.
- [PENDIENTE] Sustituir `select('*')` restantes por DTOs explícitos donde corresponda.
- [PENDIENTE] Corregir contador de instalaciones de `/api/widget/ping` mediante operación atómica.
- [PENDIENTE] Verificación de regresión completa del widget y deploy.

### Leads

- [PENDIENTE] `/api/leads/convert`: derivar `assistant_id` desde la conversación y nunca confiar en el valor del cliente.
- [PENDIENTE] Validación estricta de payload/source.
- [PENDIENTE] Eliminar interpolación insegura en filtros PostgREST.
- [PENDIENTE] Revisar concurrencia de creación/actualización de leads.

### Trial

- [PENDIENTE] Eliminar condición de carrera al iniciar trial.
- [PENDIENTE] Evitar que un trial concurrente pueda pisar una suscripción de pago.

### Assistant domains

- [PENDIENTE] Hacer atómica la comprobación de límite + inserción.
- [PENDIENTE] Hacer atómica la prevención de dominios duplicados.
- [PENDIENTE] Aprovechar/revisar `add_assistant_domain_atomic`.

### Telegram

- [PENDIENTE] Endurecer webhook secret y comportamiento cuando falta configuración.
- [PENDIENTE] Eliminar secretos/tokens de query strings en endpoints de setup.
- [PENDIENTE] Convertir operaciones de estado de GET a POST.
- [PENDIENTE] Dedupe de `update_id` y límites de coste/tiempo de IA.
- [PENDIENTE] Revisar código muerto relacionado con `telegram_bot_leads`.

### IA / costes / herramientas

- [PENDIENTE] Límites máximos de entrada, contexto y salida.
- [PENDIENTE] Timeout/cancelación y manejo seguro de errores del proveedor.
- [PENDIENTE] Separar configuración confiable de contenido no confiable en prompts.
- [PENDIENTE] Gateway server-side para futuras herramientas: tenant, usuario, rol, plan, argumentos y rate limit.
- [PENDIENTE] Confirmar que el modelo nunca pueda autorizar por sí mismo una acción.

### API / abuso / observabilidad

- [PENDIENTE] Rate limiting uniforme en endpoints sensibles.
- [PENDIENTE] Límites de tamaño/profundidad/cantidad de payloads.
- [PENDIENTE] Reducir PII y errores internos en logs.
- [PENDIENTE] Revisar endpoints de soporte por consumo excesivo de recursos.

### Dependencias

- [PENDIENTE] Actualizar Next.js desde `16.2.6` a una versión corregida compatible con el proyecto.
- [PENDIENTE] Revisar versiones efectivas de React Server Components/transitivas en lockfile.
- [PENDIENTE] Ejecutar build + pruebas + regresión después de la actualización.

### Seguridad de navegador

- [PENDIENTE] Evaluar CSP compatible con el widget y la aplicación.
- [PENDIENTE] Revisar `public/test.html` y eliminarlo/protegerlo si no es necesario en producción.

## Regla de cierre

Un módulo solo pasa a `CERRADO` cuando la corrección está aplicada, se verificó el comportamiento esperado, se revisaron regresiones y no queda una dependencia crítica pendiente dentro del mismo vector.
