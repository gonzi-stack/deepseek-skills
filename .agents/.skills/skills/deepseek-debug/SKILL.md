---
name: deepseek-debug
description: >
  Protocolo de diagnóstico de bugs obligatorio para DeepSeek R1.
  Activar SIEMPRE al corregir errores, bugs, o comportamiento inesperado,
  independientemente del stack o proyecto. Cubre: lectura de stack traces,
  clasificación de errores por tipo, hipótesis y verificación, y reporte
  estructurado de bugs irresolubles. Complementa deepseek-reasoning.
---

# DeepSeek Bug Diagnosis Skill — Universal

> **Un error no es un obstáculo — es información.**
> Tu trabajo es extraer esa información sistemáticamente antes de escribir una sola línea de corrección.

---

## Principio fundamental

> **Nunca corrijas lo que no entendés.**
> Cada corrección sin diagnóstico completo es una apuesta. A veces funciona. Siempre deja deuda técnica oculta.

El flujo correcto es siempre:
```
ERROR → LEER → ENTENDER → LOCALIZAR → HIPÓTESIS → VERIFICAR → CORREGIR
```

No:
```
ERROR → ADIVINAR → CAMBIAR COSAS → REZAR
```

---

## FASE 1 — Leer el error completo

### 1.1 Nunca leer solo la primera línea

Los errores tienen estructura. La primera línea es el síntoma. Las líneas siguientes son la causa.

```
TypeError: Cannot read properties of undefined (reading 'user')
    at createContext (src/server/context.ts:45:32)      ← dónde pasó exactamente
    at src/app/api/route.ts:12:5                        ← cómo llegamos ahí
```

- **Línea 1:** qué pasó
- **Línea 2+:** dónde pasó (archivo, línea, columna) y el call stack

Leer solo la primera línea y adivinar la causa es un error de principiante.

### 1.2 Clasificar el tipo de error antes de actuar

| Tipo | Señales | Dónde buscar |
|---|---|---|
| **TypeError / AttributeError** | `undefined is not a function`, `has no attribute` | El objeto era null/undefined cuando no debía serlo |
| **Error de tipos estáticos** | `Type 'X' is not assignable to 'Y'`, `incompatible types` | Discrepancia entre tipos declarados y reales |
| **Error de validación** | ZodError, ValidationError, schema mismatch | Input no cumple el schema esperado |
| **Error de DB** | tabla inexistente, columna inválida, constraint violada, connection refused | Schema, nombre de tabla/columna, conexión |
| **Error de imports** | `Module not found`, `Cannot resolve`, `ImportError` | Path incorrecto, export faltante, módulo no instalado |
| **Error de runtime genérico** | `500 Internal Server Error`, uncaught exception | Logs del servidor para ver el error real |
| **Error de configuración** | variables de entorno faltantes, config inválida | Archivos de configuración, .env |
| **Error de auth** | 401, 403, sesión nula inesperada | Middleware, tokens, cookies |

### 1.3 Identificar el frame propio en el stack trace

El stack trace mezcla tu código con código de librerías. El frame relevante es el primero que pertenece a `src/` (o el directorio raíz del proyecto):

```
Error: ...
    at Object.query (node_modules/orm/dist/...)   ← librería, ignorar
    at node_modules/framework/dist/...            ← librería, ignorar
    at getUserById (src/db/users.ts:23:15)        ← ← ← ESTE ES EL TUYO
    at src/api/users.ts:45:10                     ← también tuyo
```

El primer frame en código propio es donde empezar a investigar.

---

## FASE 2 — Entender el contexto del error

### 2.1 Leer el archivo y la línea exacta

Antes de cualquier hipótesis, leer el archivo en la línea indicada por el stack trace.

```
TypeError: Cannot read properties of undefined (reading 'role')
    at src/server/context.ts:67:38
```

Acción: abrir `src/server/context.ts`, ir a línea 67, leer las 10 líneas alrededor. **No adivines qué hay en esa línea. Léela.**

### 2.2 Estado esperado vs estado real

Para cada error, formulá estas dos preguntas:

**¿Qué valor esperaba el código encontrar?**
**¿Qué valor encontró en realidad?**

```
// Ejemplo:
const role = user.role;  // TypeError aquí

// Estado esperado: user es un objeto con propiedad role
// Estado real: user es undefined

// Pregunta siguiente: ¿por qué user es undefined?
// → getUser() retornó null
// → el ID pasado no existe
// → la query falló silenciosamente
```

### 2.3 Trazar el origen del valor problemático

Si `user` es undefined en línea 67, rastreá hacia atrás por el call stack:

```
Línea 67: const role = user.role          → user es undefined aquí
Línea 60: const user = await getUser(id)  → getUser retornó undefined
Línea 55: const id = session?.user?.id    → ¿session es null?
Línea 50: const session = await auth()    → ¿auth() falló silenciosamente?
```

Cada paso hacia atrás es una hipótesis que necesita verificación.

---

## FASE 3 — Errores comunes por categoría

### 3.1 Errores de null/undefined

**Causa raíz más común:** una función retornó null/undefined y el código que la llama no lo manejó.

Diagnóstico:
1. ¿Qué función devolvió el valor problemático?
2. ¿Bajo qué condición esa función puede devolver null/undefined?
3. ¿El código llamador tiene un guard para ese caso?

Fix patrón:
```typescript
// En lugar de asumir que existe:
const result = await getData(id);
return result.field;

// Verificar antes de usar:
const result = await getData(id);
if (!result) throw new NotFoundError(`ID ${id} not found`);
return result.field;
```

### 3.2 Errores de tipos estáticos (TypeScript, mypy, etc.)

**`Type 'X | undefined' is not assignable to type 'X'`**

Causa: acceso sin guard a un valor potencialmente undefined.

Fix: agregar guard explícito o usar el operador de nullish coalescing.

---

**`Type 'string | string[]' is not assignable to type 'string'`**

Causa: la función retorna una unión de tipos y el llamador espera solo uno.

Fix: narrowing explícito antes de usar el valor.

---

**`Argument of type 'X' is not assignable to parameter of type 'never'`**

Causa: switch/discriminated union no exhaustivo, o array inferido como `never[]`.

Fix: agregar tipo explícito al array o completar todos los casos del union.

### 3.3 Errores de base de datos

**Tabla o columna no existe**

Diagnóstico:
1. Verificar el schema real del proyecto (archivo de schema o migraciones)
2. Verificar el nombre exacto — nunca asumir (snake_case vs camelCase, singular vs plural)
3. Si la tabla/columna no existe: crear la migración correspondiente

---

**Constraint violada (UNIQUE, FK, NOT NULL)**

Diagnóstico:
1. Leer el error completo — dice exactamente qué constraint
2. Para UNIQUE: ¿existe lógica que prevenga duplicados antes del INSERT?
3. Para FK: ¿el registro padre existe?
4. Para NOT NULL: ¿el código siempre provee ese campo?

---

**Connection refused / timeout**

Diagnóstico:
1. Verificar variables de entorno de conexión
2. Verificar que el servicio (DB, cache, etc.) está corriendo
3. Verificar que el cliente usa las variables de env y no valores hardcodeados

### 3.4 Errores de imports y módulos

**Module not found / Cannot resolve**

Diagnóstico:
1. ¿El archivo existe en el path especificado?
2. ¿El alias de path está configurado correctamente? (`~`, `@`, etc.)
3. ¿El paquete está instalado? (revisar `package.json` o equivalente)
4. ¿El export tiene el nombre exacto que se está importando?

---

**Export not found / has no exported member**

Diagnóstico:
1. Abrir el archivo importado
2. Buscar el export con el nombre exacto
3. Si no existe: o el nombre es incorrecto, o hay que crearlo

### 3.5 Errores de runtime genérico (500)

El error 500 en el cliente oculta el error real. Siempre:
1. Mirar los logs del servidor (terminal donde corre el proceso)
2. El error real está ahí, no en el mensaje del cliente

---

## FASE 4 — Hipótesis y verificación

### 4.1 Una hipótesis a la vez

```
❌ WRONG:
"Puede ser la conexión, o el schema, o el token — cambio los tres a ver."

✅ CORRECT:
Hipótesis 1: conexión incorrecta → verifico config → no es eso
Hipótesis 2: columna con nombre diferente → leo schema → es eso ✓
```

### 4.2 El ciclo correcto

1. **Formula:** "Creo que el error es X porque Y"
2. **Predice:** "Si es correcto, cambiar Z debería producir el resultado W"
3. **Aplica** el cambio mínimo
4. **Verifica:** ¿el resultado coincide con la predicción?

Si no coincide: la hipótesis era incorrecta. Volvé a diagnosticar. No hagas más cambios.

### 4.3 Fix mínimo — nunca refactorizar mientras debuggeás

```
❌ WRONG: "Ya que estoy en este archivo para el fix, aprovecho y refactorizo X."

✅ CORRECT: Fix mínimo → funciona → refactoring en tarea separada si hace falta.
```

Cada cambio extra mientras debuggeás es ruido potencial.

---

## FASE 5 — Cómo reportar un bug irresoluble

Si después del diagnóstico completo no podés identificar la causa:

```
BUG REPORT
==========
Error exacto: [copia el error completo con stack trace]

Frame relevante: [primer frame en código propio]

Comportamiento esperado: [qué debería pasar]
Comportamiento actual: [qué está pasando]

Hipótesis descartadas:
1. [hipótesis] → descartada porque [razón]
2. [hipótesis] → descartada porque [razón]

Archivos inspeccionados:
- [archivo]: [qué encontraste]

Hipótesis actual: [lo que creés, con nivel de confianza]
```

Un reporte así permite resolver el problema en minutos.

---

## Checklist de diagnóstico — antes de escribir cualquier fix

- [ ] Leí el error completo, incluyendo stack trace
- [ ] Identifiqué el tipo de error
- [ ] Encontré el primer frame en código propio
- [ ] Leí el archivo y la línea exacta del stack trace
- [ ] Formulé el estado esperado vs estado real
- [ ] Tracé el origen del valor problemático
- [ ] Formulé una hipótesis específica
- [ ] El fix toca solo los archivos necesarios
- [ ] No estoy refactorizando mientras debuggeo

---

*Skill universal — compatible con cualquier stack o proyecto*
*Para bugs específicos del stack actual, consultar la skill de contexto del proyecto*
