# Configuración de WhatsApp Cloud API

La aplicación ya contiene el canal, el webhook, la validación de firma, la bandeja compartida, la captura de leads y la derivación humana. Solo faltan los secretos y los identificadores de tu cuenta de Meta.

## 1. Variables privadas

Copia `.env.example` como `.env.local` y completa estas variables:

```env
NEXT_PUBLIC_SITE_URL=https://conversaai.store
WHATSAPP_GRAPH_API_VERSION=vXX.X
WHATSAPP_VERIFY_TOKEN=una-cadena-aleatoria-larga
WHATSAPP_APP_SECRET=app-secret-de-meta
WHATSAPP_ACCESS_TOKEN=token-de-sistema-o-token-temporal
WHATSAPP_TOKEN_ENCRYPTION_KEY=clave-base64-de-32-bytes
```

- `WHATSAPP_GRAPH_API_VERSION`: usa una versión activa indicada actualmente por Meta. No se fija en el código para evitar depender de una versión retirada.
- `WHATSAPP_VERIFY_TOKEN`: lo eliges tú; debe ser idéntico en Vercel y Meta.
- `WHATSAPP_APP_SECRET`: está en Meta for Developers > Configuración de la app > Básica.
- `WHATSAPP_ACCESS_TOKEN`: idealmente un token permanente de usuario del sistema con permisos mínimos para WhatsApp. También puede introducirse por asistente en el panel; se cifra antes de guardarse.
- `WHATSAPP_TOKEN_ENCRYPTION_KEY`: genera una vez con `openssl rand -base64 32`. No la cambies mientras existan tokens cifrados.

Añade las mismas variables en Vercel para Production, Preview y Development según corresponda. Después fuerza un nuevo despliegue.

## 2. Webhook en Meta

En el producto WhatsApp de tu app configura:

- URL de devolución: `https://conversaai.store/api/webhooks/whatsapp`
- Token de verificación: el mismo valor de `WHATSAPP_VERIFY_TOKEN`
- Campo suscrito: `messages`

El endpoint `GET` resuelve la verificación y el `POST` exige una firma `X-Hub-Signature-256` válida usando `WHATSAPP_APP_SECRET`.

## 3. Conectar el asistente

1. Abre Dashboard > Asistentes > el asistente elegido > WhatsApp.
2. Copia desde Meta el `Phone Number ID` y el `WhatsApp Business Account ID`.
3. Si configuraste `WHATSAPP_ACCESS_TOKEN` en Vercel, deja vacío el campo del token.
4. Pulsa **Validar y conectar**.
5. Envía un mensaje al número y comprueba que aparezca en Conversaciones con canal WhatsApp.

## 4. Comportamiento incluido

- Cada número solo puede vincularse con un asistente.
- Cada mensaje entrante se procesa una sola vez.
- El contacto se registra automáticamente como lead con su nombre y teléfono.
- Las respuestas de IA consumen el límite del plan; los mensajes humanos no.
- Cuando se solicita una persona, la IA se pausa y el equipo responde desde Conversaciones.
- Las respuestas humanas se envían al WhatsApp real antes de guardarse como entregadas.
- El historial se conserva aunque el canal se desconecte.

## 5. Prueba segura

Usa primero el número de prueba de Meta y un destinatario permitido. Para responder fuera de la ventana de atención definida por Meta necesitarás una plantilla aprobada; los mensajes normales desde el inbox funcionan dentro de la ventana iniciada por el cliente.

Nunca subas `.env.local`, tokens, App Secret ni la clave de cifrado a GitHub.
