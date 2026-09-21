# AUDITORÍA DE VULNERABILIDADES IDOR/AUTORIZACIÓN

## RESUMEN
Se encontraron **3 vulnerabilidades CRÍTICAS de IDOR** y **1 ALTA** en el endpoint de widget (no autenticado).

---

## VULNERABILIDAD #1: IDOR en UPDATE de Conversaciones

**Archivo:** `src/app/api/widget/message/route.ts`  
**Línea:** 168  
**Tabla:** conversations  
**Operación:** UPDATE  
**Severidad:** 🔴 CRÍTICA (CVSS 9.1)

**Código actual:**
```typescript
await supabaseAdmin.from('conversations').update(updates).eq('id', handoffConversationId)
```

**Problema:** UPDATE sin validación de `user_id` - solo valida por `id`

**Propuesta de corrección exacta:**
```typescript
await supabaseAdmin
  .from('conversations')
  .update(updates)
  .eq('id', handoffConversationId)
  .eq('user_id', ownerId)
```

---

## VULNERABILIDAD #2: IDOR en UPDATE de Leads

**Archivo:** `src/app/api/widget/message/route.ts`  
**Línea:** 376  
**Tabla:** leads  
**Operación:** UPDATE  
**Severidad:** 🔴 CRÍTICA (CVSS 9.1)

**Código actual:**
```typescript
await supabaseAdmin.from('leads').update(updates).eq('id', existingLead.id)
```

**Problema:** UPDATE sin validación de `user_id` - solo valida por `id`

**Propuesta de corrección exacta:**
```typescript
await supabaseAdmin
  .from('leads')
  .update(updates)
  .eq('id', existingLead.id)
  .eq('user_id', ownerId)
```

---

## VULNERABILIDAD #3: Missing user_id en SELECT de Leads

**Archivo:** `src/app/api/widget/message/route.ts`  
**Línea:** 363-367  
**Tabla:** leads  
**Operación:** SELECT  
**Severidad:** 🔴 CRÍTICA (CVSS 8.7)

**Código actual:**
```typescript
const { data: existingLead } = await supabaseAdmin
  .from('leads')
  .select('*')
  .eq('conversation_id', currentConversationId)
  .single()
```

**Problema:** SELECT sin validación de `user_id` - permite lectura de leads ajenos

**Propuesta de corrección exacta:**
```typescript
const { data: existingLead } = await supabaseAdmin
  .from('leads')
  .select('*')
  .eq('conversation_id', currentConversationId)
  .eq('user_id', ownerId)
  .single()
```

---

## VULNERABILIDAD #4: Bypass potencial - UPDATE sin user_id

**Archivo:** `src/app/api/widget/message/route.ts`  
**Línea:** 224-236  
**Tabla:** conversations  
**Operación:** UPDATE  
**Severidad:** 🟠 ALTA (CVSS 7.5)

**Código actual:**
```typescript
const { data: conv, error: convError } = await supabaseAdmin
  .from('conversations')
  .update({...})
  .eq('id', currentConversationId)
  .eq('assistant_id', assistantId)
  .eq('visitor_id', visitorId)
  .select()
  .single()
```

**Problema:** Valida assistant_id y visitor_id, pero NO user_id - defensa incompleta

**Propuesta de corrección exacta:**
```typescript
const { data: conv, error: convError } = await supabaseAdmin
  .from('conversations')
  .update({...})
  .eq('id', currentConversationId)
  .eq('assistant_id', assistantId)
  .eq('visitor_id', visitorId)
  .eq('user_id', ownerId)
  .select()
  .single()
```

---

## TABLA RESUMEN

| # | Archivo | Línea | Tabla | Op. | Severidad | Corrección |
|---|---------|-------|-------|-----|-----------|-----------|
| 1 | widget/message/route.ts | 168 | conversations | UPDATE | CRÍTICA | `.eq('user_id', ownerId)` |
| 2 | widget/message/route.ts | 376 | leads | UPDATE | CRÍTICA | `.eq('user_id', ownerId)` |
| 3 | widget/message/route.ts | 363-367 | leads | SELECT | CRÍTICA | `.eq('user_id', ownerId)` |
| 4 | widget/message/route.ts | 224-236 | conversations | UPDATE | ALTA | `.eq('user_id', ownerId)` |

---

## RUTAS AUDITADAS SIN VULNERABILIDADES

✅ assistants/route.ts  
✅ assistants/[id]/route.ts  
✅ conversations/route.ts  
✅ conversations/[id]/route.ts  
✅ conversations/[id]/messages/route.ts  
✅ leads/route.ts  
✅ leads/[id]/route.ts
