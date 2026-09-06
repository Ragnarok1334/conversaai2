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
