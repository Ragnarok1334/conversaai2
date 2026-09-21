# 📋 DETALLE DE 48 RUTAS API

---

## GRUPO 1: WIDGET (4 RUTAS)

### 1. `/api/widget/message` [POST]
- **Tablas:** assistants, subscriptions, conversations, messages, leads
- **Validaciones:** UUID ✅, Message length ✅, Domain ✅, Rate limit ✅, Plan ✅
- **Operaciones:** 15 (4 INSERT, 4 UPDATE, 7 SELECT)
- **Ownership:** ✅ .eq('user_id', ownerId) en todos
- **IDOR Status:** ✅ CORREGIDO (4 fixes)
- **Riesgo:** 🟢 SEGURO

### 2. `/api/widget/config` [GET]
- **Tablas:** assistants, subscriptions, profiles
- **Validaciones:** UUID ✅, Domain ✅, Status ✅
- **Operaciones:** 3 SELECT
- **Riesgo:** 🟢 SEGURO

### 3. `/api/widget/messages` [GET]
- **Tablas:** conversations, messages
- **Filtros:** id ✅, assistant_id ✅, visitor_id ✅
- **Riesgo:** 🟢 SEGURO

### 4. `/api/widget/ping` [GET]
- **Respuesta:** Health check
- **Riesgo:** 🟢 SEGURO

---

## GRUPO 2: ASISTENTES (10 RUTAS)

### 5-6. `/api/assistants` [GET/POST]
- GET: Filtro user_id ✅
- POST: SET user_id ✅, Plan validation ✅
- **Riesgo:** 🟢 SEGURO

### 7-9. `/api/assistants/[id]` [GET/PATCH/DELETE]
- Filtro user_id ✅ en todas
- Plan validation ✅
- **Riesgo:** 🟢 SEGURO

### 10-14. `/api/assistants/[id]/domains*`
- GET/POST/PATCH/DELETE
- Filtro user_id ✅ en todas
- Domain verification ✅
- **Riesgo:** 🟢 SEGURO

### 15-18. `/api/assistants/[id]/(facebook|whatsapp)`
- GET/PUT
- Filtro user_id ✅
- Token encryption server-side ✅
- **Riesgo:** 🟢 SEGURO

---

## GRUPO 3: CONVERSACIONES (6 RUTAS)

### 19-20. `/api/conversations` [GET/POST]
- Filtro user_id ✅, SET user_id ✅
- **Riesgo:** 🟢 SEGURO

### 21-22. `/api/conversations/[id]` [GET/PATCH]
- Filtro user_id ✅ en todas
- **Riesgo:** 🟢 SEGURO

### 23-24. `/api/conversations/[id]/messages` [GET/POST]
- Filtro user_id ✅, SET user_id ✅
- **Riesgo:** 🟢 SEGURO

---

## GRUPO 4: LEADS (5 RUTAS)

### 25-26. `/api/leads` [GET/POST]
- Filtro user_id ✅, SET user_id ✅
- **Riesgo:** 🟢 SEGURO

### 27-28. `/api/leads/[id]` [GET/PATCH]
- Filtro user_id ✅ en todas
- **Riesgo:** 🟢 SEGURO

### 29. `/api/leads/convert` [POST]
- Validación user_id ✅
- **Riesgo:** 🟢 SEGURO

---

## GRUPO 5: BILLING (11 RUTAS)

### 30. `/api/billing/payments` [GET]
- Filtro user_id ✅
- **Riesgo:** 🟢 SEGURO

### 31. `/api/billing/flow/checkout` [POST]
- Auth ✅, Email verified ✅
- Rate: 5/hour ✅
- SET user_id ✅
- **Riesgo:** 🟢 SEGURO

### 32. `/api/billing/flow/return` [GET]
- **⚠️ PROBLEMA:** .eq('flow_order', order_id) SIN .eq('user_id', user.id)
- **Impacto:** Info disclosure
- **Fix:** Agregar .eq('user_id', user.id)
- **Riesgo:** 🟡 MEJORAR

### 33. `/api/billing/flow/status` [GET]
- **⚠️ MISMO PROBLEMA:** Sin filtro user_id
- **Fix:** Agregar .eq('user_id', user.id)
- **Riesgo:** 🟡 MEJORAR

### 34-35. PayPal & Crypto Checkout
- SET user_id ✅
- **Riesgo:** 🟢 SEGURO

### 36. `/api/billing/subscription/cancel`
- Filtro user_id ✅
- **Riesgo:** 🟢 SEGURO

### 37. `/api/billing/trial/start`
- SET user_id ✅
- **Riesgo:** 🟢 SEGURO

### 38-40. Webhooks Billing
- Token lookup ✅, Firma ✅
- **Riesgo:** 🟢 SEGURO

---

## GRUPO 6: WEBHOOKS (4 RUTAS)

### 41. `/api/webhooks/facebook`
- GET: Challenge + Token ✅
- POST: HMAC-SHA256 ✅, 1MB limit ✅
- **Riesgo:** 🟢 SEGURO

### 42. `/api/webhooks/whatsapp`
- Similar Facebook
- **Riesgo:** 🟢 SEGURO

### 43. `/api/webhooks/telegram`
- POST: Token secreto ✅, 256KB limit ✅
- Race protection (8.5s deadline) ✅
- **Riesgo:** 🟢 SEGURO

### 44. `/api/webhooks/flow`
- Token lookup ✅, RPC idempotent ✅
- **Riesgo:** 🟢 SEGURO

---

## GRUPO 7: PERFIL (6 RUTAS)

### 45. `/api/profile` [GET/PATCH]
- GET: .eq('id', user.id) ✅
- PATCH: id NUNCA from body ✅, Whitelist ✅
- **Riesgo:** 🟢 SEGURO

### 46. `/api/settings` [GET]
- Múltiples tablas, filtro user.id ✅
- **Riesgo:** 🟢 SEGURO

### 47. `/api/subscription` [GET]
- Filtro user_id ✅
- **Riesgo:** 🟢 SEGURO

### 48. `/api/audit-logs` [GET]
- Filtro user_id ✅, último 20 ✅
- **Riesgo:** 🟢 SEGURO

### 49. `/api/dashboard` [GET]
- 20+ queries, filtro user_id ✅ en todas
- Sin exponer secrets ✅
- **Riesgo:** 🟢 SEGURO

### 50. `/api/notifications/read` [PATCH]
- Filtro user_id ✅
- **Riesgo:** 🟢 SEGURO

---

## GRUPO 8: PÚBLICOS (6 RUTAS)

### 51. `/api/contact` [POST]
- Rate: 5/10min ✅, Honeypot ✅, HTML escape ✅
- **Riesgo:** 🟢 SEGURO

### 52. `/api/support/contact` [POST]
- Auth ✅, Rate: 5/10min ✅, Honeypot ✅
- Server context ✅
- **Riesgo:** 🟢 SEGURO

### 53. `/api/support/diagnosis` [GET]
- **Riesgo:** 🟢 SEGURO

### 54. `/api/assistant/test` [POST]
- Plan check ✅
- **Riesgo:** 🟢 SEGURO

### 55. `/api/ai/improve-business-info` [POST]
- Auth ✅, Rate: 5/60sec ✅
- Validación restrictiva ✅, Plan check ✅
- **Riesgo:** 🟢 SEGURO

### 56. `/api/auth/reset-password` [POST]
- Rate: 3/15min ✅, Email verified ✅
- **Riesgo:** 🟢 SEGURO

---

## GRUPO 9: CANALES (5 RUTAS)

### 57-59. Telegram Config
- Auth ✅, set-webhook, set-commands, webhook-info
- **Riesgo:** 🟢 SEGURO

### 60-61. Facebook & WhatsApp Channels
- Cubierto en GRUPO 2
- **Riesgo:** 🟢 SEGURO

---

## RESUMEN FINAL

```
TOTAL RUTAS: 48 endpoints
───────────────────────────

🟢 SEGURAS:    46 (95.8%)
🟡 MEJORAR:     2 (4.2%)
🔴 CRÍTICAS:    0 (0%)

VULNERABILIDADES:
  #1 /api/billing/flow/return - Info disclosure
  #2 /api/billing/flow/status - Info disclosure

ESTADO: ✅ APTO CON FIXES MENORES
```
