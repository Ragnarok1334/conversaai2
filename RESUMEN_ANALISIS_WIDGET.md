# ANÁLISIS PROFUNDO: src/app/api/widget/message/route.ts - RESUMEN EJECUTIVO

---

## 1️⃣ RESPUESTA: ¿De dónde viene ownerId?

### FLUJO SEGURO ✅

```
Línea 51-55: assistantId (del cliente, validado como UUID)
    ↓
SELECT * FROM assistants WHERE id = assistantId
    ↓
Línea 65: const ownerId = assistant.user_id (EXTRAE DE BD)
```

**Conclusión:** ownerId NO puede ser manipulado por el cliente. Se obtiene directamente de la BD.

---

## 2️⃣ RESPUESTA: ¿Puede ser manipulado desde el cliente?

**NO** ✅

| Elemento | Origen | Manipulable |
|----------|--------|------------|
| assistantId | Cliente → validado UUID | NO |
| assistant record | SELECT FROM DB | NO |
| assistant.user_id | Campo en BD | NO |
| ownerId | Asignado de assistant.user_id | NO |

---

## 3️⃣ RESPUESTA: ¿Se obtiene siempre desde assistant/channel/database?

**SÍ** ✅

1. Cliente envía `assistantId`
2. Línea 51-55: SELECT assistants por ID
3. Línea 65: ownerId = resultado.user_id

**No hay source alternativo** - ownerId siempre viene de la BD.

---

## 4️⃣ RESPUESTA: ¿Otros UPDATE/DELETE sin user_id?

**LISTA COMPLETA DE OPERACIONES supabaseAdmin:**

### 15 operaciones total:

**✅ SEGURAS (12 operaciones):**
1. Línea 51-55: SELECT assistants (lectura OK)
2. Línea 96-101: SELECT subscriptions `.eq('user_id', ownerId)` ✅
3. Línea 102-106: SELECT profiles `.eq('id', ownerId)` ✅
4. Línea 141-153: INSERT conversations `user_id: ownerId` ✅
5. Línea 171-179: INSERT messages `user_id: ownerId` ✅
6. Línea 190-198: INSERT messages `user_id: ownerId` ✅
7. Línea 244-256: INSERT conversations `user_id: ownerId` ✅
8. Línea 268-273: SELECT messages `.eq('conversation_id', ...)` lectura ✅
9. Línea 274-278: SELECT leads `.eq('conversation_id', ...)` lectura ✅
10. Línea 298-306: INSERT messages `user_id: ownerId` ✅
11. Línea 341-349: INSERT messages `user_id: ownerId` ✅
12. Línea 379-388: INSERT leads `user_id: ownerId` ✅

**🔴 VULNERABLES (4 operaciones):**
1. Línea 168: UPDATE conversations `.eq('id', ...)` SIN user_id ❌
2. Línea 225-236: UPDATE conversations `.eq('id/assistant_id/visitor_id', ...)` SIN user_id ❌
3. Línea 363-367: SELECT leads `.eq('conversation_id', ...)` SIN user_id ❌
4. Línea 376: UPDATE leads `.eq('id', ...)` SIN user_id ❌

### NO hay DELETE operations en el archivo.

---

## 5️⃣ RIESGOS RESTANTES CRÍTICOS

### Riesgo CRÍTICO #1 (Línea 168):
```
UPDATE conversations SIN validación de user_id
Atacante: modifica conversación ajena con UUID conocido
Impacto: Cambiar estado, derivación, historial
```

### Riesgo CRÍTICO #2 (Línea 363-367):
```
SELECT leads SIN validación de user_id
Atacante: enumera leads de otros usuarios por conversation_id
Impacto: Divulga email, teléfono, nombre de clientes ajenos
```

### Riesgo CRÍTICO #3 (Línea 376):
```
UPDATE leads SIN validación de user_id
Atacante: modifica leads ajenos (cambiar estado, borrar info)
Impacto: Corrupción de CRM, falsos conversiones
```

### Riesgo ALTO #4 (Línea 225-236):
```
UPDATE conversations CON triple validación PERO SIN user_id
Atacante: si RLS bypass, actualiza conversaciones ajenas
Impacto: Defensa en profundidad incompleta
```

---

## 📊 TABLA FINAL

| Línea | Tabla | Operación | Validación Actual | Falta | Severidad |
|-------|-------|-----------|-------------------|-------|-----------|
| 168 | conversations | UPDATE | id only | user_id | CRÍTICA |
| 225-236 | conversations | UPDATE | id,assistant_id,visitor_id | user_id | ALTA |
| 363-367 | leads | SELECT | conversation_id only | user_id | CRÍTICA |
| 376 | leads | UPDATE | id only | user_id | CRÍTICA |

---

## 🎯 CONCLUSIÓN

✅ **ownerId es SEGURO** - No manipulable desde cliente

❌ **Endpoint tiene 4 vulnerabilidades IDOR críticas** en operaciones que NO validan user_id

🔧 **Corrección simple:** Agregar `.eq('user_id', ownerId)` en líneas 168, 225-236, 363-367, 376
