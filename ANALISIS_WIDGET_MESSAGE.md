# ANÁLISIS PROFUNDO: src/app/api/widget/message/route.ts

## 1. FLUJO DE OBTENCIÓN DE ownerId

### Origen de ownerId:
```typescript
// Línea 51-55: SELECT sin filtro de user_id
const { data: assistant, error: assistantError } = await supabaseAdmin
  .from('assistants')
  .select('*')
  .eq('id', assistantId)
  .single()

// Línea 65: ownerId se obtiene del asistente encontrado
const ownerId = assistant.user_id
```

### ¿Puede ser manipulado desde el cliente?

**NO - ownerId es SEGURO** ✅

- El cliente envía solo `assistantId` (UUID validado)
- `ownerId` se extrae desde la base de datos (tabla `assistants`)
- La BD devuelve `user_id` del propietario del asistente
- No se puede modificar desde el cliente

**Análisis de flujo:**
```
Cliente → assistantId (UUID) → Database query → assistant record → assistant.user_id ✅ SEGURO
```

---

## 2. OPERACIONES supabaseAdmin EN EL ARCHIVO

### LISTA COMPLETA (15 operaciones):

#### ✅ SEGURAS (12 operaciones con validación correcta):

**1. Línea 51-55: SELECT assistants**
```typescript
await supabaseAdmin.from('assistants').select('*').eq('id', assistantId).single()
```
- ✅ SELECT sin restricción user_id = OK (solo lectura)

**2. Línea 96-101: SELECT subscriptions**
```typescript
supabaseAdmin.from('subscriptions')
  .select('plan, current_messages_used, messages_limit, status, ...')
  .eq('user_id', ownerId)  // ✅ Validado por ownerId
  .single()
```
- ✅ Validado por `ownerId` derivado de asistente

**3. Línea 102-106: SELECT profiles**
```typescript
supabaseAdmin.from('profiles')
  .select('trial_used, trial_ends_at')
  .eq('id', ownerId)  // ✅ Validado por ownerId
  .single()
```
- ✅ Validado por `ownerId`

**4. Línea 124-131: SELECT conversations (handoff flow)**
```typescript
await supabaseAdmin
  .from('conversations')
  .select('id, ai_paused, handoff_status')
  .eq('id', conversationId)
  .eq('assistant_id', assistantId)
  .eq('visitor_id', visitorId)
  .maybeSingle()
```
- ⚠️ Múltiples validaciones (id + assistant_id + visitor_id) pero Missing: NO valida `user_id`

**5-12. INSERT operations (conversions, messages):**
```typescript
// Línea 141-153, 171-179, 190-198, 244-256, 268-273, 274-278, 298-306, 341-349
await supabaseAdmin.from('conversations').insert({
  user_id: ownerId,  // ✅ Set by ownerId
  ...
})
await supabaseAdmin.from('messages').insert({
  user_id: ownerId,  // ✅ Set by ownerId
  ...
})
```
- ✅ TODOS los INSERT tienen `user_id: ownerId` explícitamente

---

#### 🔴 VULNERABLES (3 operaciones SIN validación user_id):

**VULN #1: Línea 168 - UPDATE conversations**
```typescript
await supabaseAdmin.from('conversations').update(updates).eq('id', handoffConversationId)
```
- ❌ UPDATE sin `.eq('user_id', ownerId)`
- Riesgo: IDOR directo

**VULN #2: Línea 225-236 - UPDATE conversations**
```typescript
await supabaseAdmin.from('conversations')
  .update({...})
  .eq('id', currentConversationId)
  .eq('assistant_id', assistantId)
  .eq('visitor_id', visitorId)
  .select()
  .single()
```
- ⚠️ Validación multi-campo pero Missing `user_id`
- Riesgo: RLS bypass potential

**VULN #3: Línea 363-367 - SELECT leads**
```typescript
const { data: existingLead } = await supabaseAdmin
  .from('leads')
  .select('*')
  .eq('conversation_id', currentConversationId)
  .single()
```
- ❌ SELECT sin `.eq('user_id', ownerId)`
- Riesgo: Divulga leads ajenos

**VULN #4: Línea 376 - UPDATE leads**
```typescript
await supabaseAdmin.from('leads').update(updates).eq('id', existingLead.id)
```
- ❌ UPDATE sin `.eq('user_id', ownerId)`
- Riesgo: IDOR directo

