# Facebook Messenger en ConversaAI

## Variables privadas de Vercel

Configura estas variables en Production, Preview y Development:

```env
META_GRAPH_API_VERSION=vXX.X
META_APP_SECRET=app_secret_de_meta
META_TOKEN_ENCRYPTION_KEY=clave_base64_de_32_bytes
FACEBOOK_VERIFY_TOKEN=token_aleatorio_exclusivo_del_webhook
```

`META_TOKEN_ENCRYPTION_KEY` puede omitirse temporalmente si ya existe
`WHATSAPP_TOKEN_ENCRYPTION_KEY`; el servidor usará esa clave como respaldo. No
expongas ninguna de estas variables con el prefijo `NEXT_PUBLIC_`.

## Meta Developers

1. Añade Messenger a la aplicación de Meta y vincula la Página.
2. Configura `https://conversaai.store/api/webhooks/facebook` como URL de devolución.
3. Usa el valor exacto de `FACEBOOK_VERIFY_TOKEN` para verificar el webhook.
4. Suscribe `messages`, `messaging_postbacks`, `messaging_reads` y `message_deliveries`.
5. Genera un token permanente de Página con los permisos mínimos requeridos por Meta.
6. En ConversaAI abre Asistente → Facebook, introduce el ID de Página y el token, y pulsa **Validar y conectar**.

La ruta de conexión valida que el token pertenece a la Página, suscribe la app y
guarda únicamente una versión cifrada AES-256-GCM. Los webhooks POST sin una firma
`X-Hub-Signature-256` válida se rechazan antes de procesar el cuerpo.
