# Internal Services

This directory contains server-only privileged services.

These modules may use:

- Supabase service_role
- privileged database operations
- background processing

Allowed use cases:

- External webhooks
- Billing processing
- Security systems
- Internal jobs
- System automation

Do not import these modules into:

- Client components
- Public UI code
- Normal user CRUD flows

Before adding privileged access, verify whether RLS with createClient() is enough.