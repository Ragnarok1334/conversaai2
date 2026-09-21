# 📊 ANÁLISIS TABLAS SUPABASE

---

## Resumen de 14 Tablas

| Tabla | Acceso | CRUD | Filtro | Status |
|-------|--------|------|--------|--------|
| assistants | Auth | CRUD | user_id | 🟢 |
| conversations | Auth | CRUD | user_id | 🟢 |
| messages | Auth | CR | user_id | 🟢 |
| leads | Auth | CRUD | user_id | 🟢 |
| subscriptions | Auth | RU | user_id | 🟢 |
| profiles | Auth | RU | id | 🟢 |
| assistant_domains | Auth | CRUD | user_id | 🟢 |
| whatsapp_channels | Auth | CRUD | user_id | 🟢 |
| facebook_channels | Auth | CRUD | user_id | 🟢 |
| billing_payments | Auth | CRU | user_id ⚠️ | 🟡 |
| audit_logs | Auth | CI | user_id | 🟢 |
| notifications | Auth | CRUD | user_id | 🟢 |
| whatsapp_webhook_events | Webhook | C | — | 🟢 |
| facebook_webhook_events | Webhook | C | — | 🟢 |

---

## TABLA 1-4: Datos Principales

### assistants ✅
- PK: id (UUID) | FK: user_id
- Ops: ✅ SELECT/INSERT/UPDATE/DELETE con .eq('user_id')
- Rutas: GET/POST /api/assistants[/id] (5 rutas)

### conversations ✅
- PK: id (UUID) | FK: user_id, assistant_id
- Ops: ✅ Todos con .eq('user_id')
- Rutas: Widget + 4 rutas conversaciones

### messages ✅
- PK: id (UUID) | FK: user_id, conversation_id
- Ops: ✅ SELECT/INSERT con .eq('user_id')
- Rutas: Widget message POST, GET conversaciones

### leads ✅
- PK: id (UUID) | FK: user_id, assistant_id
- Ops: ✅ CRUD con .eq('user_id')
- Rutas: 5 rutas leads

---

## TABLA 5-9: Configuración

### subscriptions ✅
- PK: id | FK: user_id (Unique)
- Ops: ✅ SELECT/INSERT/UPDATE con .eq('user_id')
- Rutas: /api/subscription, /api/billing/*

### profiles ✅
- PK: id (auth.users.id) - ESPECIAL
- Ops: ✅ SELECT/UPDATE con .eq('id')
- Seguridad: id NUNCA from body ✅, Whitelist ✅
- Ruta: /api/profile

### assistant_domains ✅
- PK: id | FK: user_id, assistant_id
- Ops: ✅ CRUD con .eq('user_id')
- Rutas: /api/assistants/[id]/domains*

### whatsapp_channels ✅
- PK: id | FK: user_id, assistant_id
- Ops: ✅ CRUD con .eq('user_id')
- Seguridad: Token AES-256 ✅, RLS revoked ✅
- Ruta: /api/assistants/[id]/whatsapp

### facebook_channels ✅
- Igual a WhatsApp
- Ruta: /api/assistants/[id]/facebook

---

## TABLA 10: CRÍTICA ⚠️

### billing_payments 🟡

**Tabla:** PK:id | FK:user_id | Index:user_id,flow_token,flow_order

**Rutas Seguras:**
- ✅ GET /api/billing/payments - .eq('user_id', user.id)
- ✅ POST /api/billing/flow/checkout - SET user_id
- ✅ POST /api/webhooks/flow - Token lookup

**Rutas CON PROBLEMA:**
- 🟡 GET /api/billing/flow/return
  - Código: `.eq('flow_order', order_id)` SIN `.eq('user_id', user.id)`
  - Impacto: Info disclosure de pagos ajenos
  
- 🟡 GET /api/billing/flow/status
  - Mismo problema

**Fix:**
```typescript
.eq('flow_order', order_id)
.eq('user_id', user.id)  // ← AGREGAR
```

---

## TABLA 11-14: Auditoría y Eventos

### audit_logs ✅
- PK: id | FK: user_id
- Ops: ✅ SELECT/INSERT con .eq('user_id')
- Ruta: /api/audit-logs

### notifications ✅
- PK: id | FK: user_id
- Ops: ✅ CRUD con .eq('user_id')
- Ruta: /api/notifications/read

### whatsapp_webhook_events ✅
### facebook_webhook_events ✅
- Append-only, sin acceso cliente
- RLS: ALL operations false ✅

---

## PATRONES SEGURIDAD

### ✅ Patrón General
```
SELECT: .eq('user_id', auth.uid())
INSERT: SET user_id = auth.uid()
UPDATE: .eq('user_id', auth.uid())
DELETE: .eq('user_id', auth.uid())
```

### ✅ Excepciones (Seguras)
- **profiles:** usa .eq('id', auth.uid()) - OK
- **webhook_events:** RLS total denegado

### ✅ Especiales
- **Tokens:** AES-256-GCM encryption
- **whatsapp/facebook:** Client INSERT/UPDATE/DELETE revoked
- **audit_logs:** Append-only

---

## ESTADO FINAL

```
Total Tablas: 14

🟢 Seguras: 13 (92.9%)
  ✅ Todos los filtros correctos
  ✅ Ownership validado
  ✅ Secrets encriptados

🟡 Mejorar: 1 (7.1%)
  ⚠️ billing_payments (2 rutas)

ACCIÓN: Agregar .eq('user_id', user.id)
en /api/billing/flow/return y status

VEREDICTO: ✅ APTO CON FIXES MENORES
```
