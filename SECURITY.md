# Seguridad de ConversaAI

## Controles implementados

- Cabeceras CSP, HSTS, `nosniff`, política de permisos y protección de marcos.
- Rutas privadas protegidas por sesión de Supabase.
- Validación de UUID, visitantes, URLs, mensajes y tipos de contenido.
- Límites de tamaño antes de interpretar JSON o formularios públicos.
- CORS del widget ligado al origen y al dominio autorizado del asistente.
- Conversaciones del widget ligadas al `visitor_id` para impedir secuestro por ID.
- Secretos operativos enviados por cabecera y comparados en tiempo constante.
- Webhook de Telegram cerrado cuando falta su secreto.
- Confirmación de pagos Flow consultada directamente al proveedor e idempotencia en RPC.
- Límites de solicitudes y consumo respaldados por Supabase.

## Verificación local

Con el servidor en ejecución:

```bash
npm run security:audit
npm run security:smoke
```

Para probar otro host:

```bash
BASE_URL=https://tu-dominio.example npm run security:smoke
```

La prueba `security:smoke` no modifica datos. Comprueba cabeceras, autenticación,
límites de cuerpo, validación de entrada, CORS y secretos incorrectos.

## Reglas de operación

- Nunca expongas `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `FLOW_SECRET_KEY`,
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` o `SETUP_SECRET` al navegador.
- Usa secretos aleatorios largos y diferentes entre producción y desarrollo.
- Mantén RLS activo en todas las tablas con datos de clientes.
- Revisa periódicamente los eventos de auditoría y los intentos bloqueados.
- Ejecuta `npm audit` y la compilación antes de cada despliegue.
- Prueba ataques únicamente en local o en un entorno propio autorizado.
