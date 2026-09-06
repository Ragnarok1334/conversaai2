# Security deployment requirements

## Widget session secret

The hardened public widget requires a dedicated `WIDGET_SESSION_SECRET` server
environment variable. Generate at least 32 random bytes and configure the same
value in every application instance before deploying this branch.

Example generation command:

```bash
openssl rand -base64 48
```

Never expose this value through a `NEXT_PUBLIC_` variable, commit it to Git, or
reuse the Supabase service-role key. Rotating it invalidates existing anonymous
widget sessions; browsers will receive a new session on their next config load.

The widget session token is bound to the assistant, normalized domain, random
server-issued visitor identifier, and expiration time. The current lifetime is
24 hours.

## Telegram secrets

Telegram now fails closed unless `TELEGRAM_WEBHOOK_SECRET` is configured with at
least 16 characters. Also configure a separate `SETUP_SECRET` of at least 16
characters for the operational endpoints. Do not reuse the bot token, widget
secret, or Supabase service-role key.

The setup secret must be sent in the `X-Setup-Secret` request header. It is no
longer accepted as a query parameter, because URLs can be retained in browser,
proxy, and analytics logs.

After deployment, register and inspect the webhook from a trusted terminal:

```bash
curl -H "X-Setup-Secret: $SETUP_SECRET" https://YOUR_DOMAIN/api/telegram/set-webhook
curl -H "X-Setup-Secret: $SETUP_SECRET" https://YOUR_DOMAIN/api/telegram/set-commands
curl -H "X-Setup-Secret: $SETUP_SECRET" https://YOUR_DOMAIN/api/telegram/webhook-info
```
