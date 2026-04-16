---
name: deepseek-review
description: >
  Protocolo de revisión de código obligatorio para DeepSeek R1.
  Activar SIEMPRE al revisar código propio antes de entregar, al hacer
  code review de código ajeno, al evaluar un PR, o al auditar un módulo
  existente. Cubre: revisión estructurada por capas, detección de problemas
  que el autor no ve, criterios de aprobación y rechazo, y feedback
  accionable. Complementa deepseek-code-quality desde la perspectiva del revisor.
---

# DeepSeek Code Review Skill — Universal

> **El autor del código es el peor revisor del código.**
> Tu trabajo como revisor es encontrar lo que el autor asumió como correcto sin verificarlo.

---

## Principio fundamental

> **Una revisión no es una opinión. Es un diagnóstico.**
> Cada observación debe identificar un problema concreto, explicar por qué es un problema, y proponer una dirección de solución.

```
❌ WRONG: "Este código podría mejorarse."
✅ CORRECT: "La función getUser no tiene guard para el caso null (línea 34).
             Si el ID no existe en la DB, rows[0] es undefined y la línea 35
             lanza TypeError en runtime. Agregar: if (!rows[0]) return null;"
```

---

## FASE 1 — Orientación antes de revisar

### 1.1 Entender qué se está revisando

Antes de leer una sola línea de código:

```
CONTEXTO DE REVISIÓN
====================
¿Qué hace este código? [descripción en una oración]
¿Qué problema resuelve? [contexto de negocio]
¿Qué cambió respecto a antes? [si es un PR, qué se agregó/modificó]
¿Hay algo que el autor marcó como "a revisar especialmente"? [notas del PR]
```

Revisar sin contexto produce observaciones irrelevantes.

### 1.2 Leer el diff completo antes de comentar

```
❌ WRONG: Comentar línea por línea mientras se lee.
✅ CORRECT: Leer todo primero. Entender el flujo completo. Luego comentar.
```

Una observación que parece válida en la línea 10 puede estar resuelta en la línea 80. Leer todo antes de comentar evita noise.

---

## FASE 2 — Revisión por capas

Revisar en este orden. Cada capa tiene problemas distintos.

### 2.1 Capa de Corrección — ¿El código hace lo que dice?

**Preguntas:**
- ¿El comportamiento implementado coincide con el comportamiento requerido?
- ¿Hay casos edge no contemplados?
- ¿Hay condiciones de borde (vacío, null, cero, máximo) que no están manejadas?

```typescript
// Problema de corrección — el código "funciona" pero está mal
function divide(a: number, b: number): number {
  return a / b;
  // ❌ b puede ser 0 — no está contemplado
  // El código hace lo que dice pero falla en un caso real
}

// ✅ CORRECT
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}
```

**Casos edge obligatorios a verificar:**
- ¿Qué pasa con input vacío? (`""`, `[]`, `{}`, `0`, `null`, `undefined`)
- ¿Qué pasa si la DB retorna 0 filas? ¿1 fila? ¿muchas filas?
- ¿Qué pasa si una operación async falla?
- ¿Qué pasa si el mismo endpoint se llama dos veces seguidas?

### 2.2 Capa de Seguridad — ¿El código es seguro?

Estos son los únicos problemas que pueden bloquear un PR de forma no negociable.

```
CHECKLIST DE SEGURIDAD — BLOQUEANTES
======================================
[ ] Sin SQL/query injection (inputs siempre parameterizados)
[ ] Sin credenciales o secretos hardcodeados
[ ] Sin datos sensibles en logs
[ ] Ownership verificado server-side (nunca confiar en input del cliente)
[ ] IDs y tokens generados criptográficamente
[ ] Sin datos eliminados expuestos (soft delete filtrado)
[ ] Sin detalles internos en mensajes de error al cliente
[ ] Inputs externos validados en el boundary antes de usarse
```

Cualquier falla en este checklist es un rechazo inmediato, independientemente de la calidad del resto.

### 2.3 Capa de Contratos — ¿Las interfaces son correctas?

**Preguntas:**
- ¿Los tipos de input y output son correctos y completos?
- ¿Hay funciones públicas sin tipo de retorno declarado?
- ¿Los nombres describen el intent o el detalle de implementación?
- ¿Cambió algún contrato público sin actualizar todos los llamadores?

```typescript
// ❌ Contrato ambiguo
async function process(data: any): Promise<any> { ... }

// ✅ Contrato explícito
async function processPayment(params: ProcessPaymentParams): Promise<PaymentResult> { ... }
```

### 2.4 Capa de Mantenibilidad — ¿El código se puede entender y modificar?

**Preguntas:**
- ¿Una función nueva en el proyecto puede entender este código en 5 minutos?
- ¿Hay lógica duplicada que debería estar centralizada?
- ¿Las funciones tienen una sola responsabilidad?
- ¿Los nombres son semánticos o genéricos (`data`, `result`, `temp`)?
- ¿Hay comentarios donde el código no puede explicarse solo?

**Regla de complejidad:** Si una función tiene más de 3 niveles de indentación o más de 4 condiciones, es una señal de que necesita ser dividida.

```typescript
// ❌ Complejidad innecesaria — 4 niveles de indentación
function processOrder(order) {
  if (order) {
    if (order.items.length > 0) {
      if (order.user) {
        if (order.user.isVerified) {
          // lógica real aquí
        }
      }
    }
  }
}

// ✅ Early returns — flat y legible
function processOrder(order: Order) {
  if (!order) throw new InvalidOrderError();
  if (order.items.length === 0) throw new EmptyOrderError();
  if (!order.user) throw new MissingUserError();
  if (!order.user.isVerified) throw new UnverifiedUserError();
  // lógica real aquí — sin indentación profunda
}
```

### 2.5 Capa de Consistencia — ¿El código es coherente con el proyecto?

**Preguntas:**
- ¿Sigue las convenciones de naming del proyecto?
- ¿Usa los mismos patrones que el código existente para problemas similares?
- ¿Introduce una nueva dependencia sin justificación?
- ¿Usa el mismo estilo de error handling que el resto del proyecto?

```
❌ Problema de consistencia:
El proyecto entero usa repositorios para acceso a datos.
Este PR hace queries SQL directamente en el endpoint.
Introduce un patrón nuevo sin justificación → inconsistencia estructural.
```

### 2.6 Capa de Performance — ¿Hay problemas obvios de eficiencia?

Solo señalar problemas que son observables y concretos. No especular.

**Señales de alerta:**
- Queries dentro de loops (N+1)
- `SELECT *` en tablas grandes
- Operaciones O(n²) sobre colecciones que pueden crecer
- Ausencia de LIMIT en queries de lista
- Carga de datos completos cuando solo se necesita una parte

```typescript
// ❌ N+1 — una query por cada order
const orders = await getOrders(userId);
for (const order of orders) {
  order.items = await getItemsForOrder(order.id); // query dentro de loop
}

// ✅ Una query con JOIN o una query batch
const orders = await getOrdersWithItems(userId);
```

---

## FASE 3 — Clasificar las observaciones

No todas las observaciones tienen el mismo peso. Clasificar evita que el autor trate un detalle menor como un problema crítico.

| Nivel | Label | Descripción | ¿Bloquea el PR? |
|---|---|---|---|
| 🔴 **BLOQUEANTE** | `[BLOQUEANTE]` | Bug, vulnerabilidad de seguridad, o contrato roto | Sí — debe resolverse antes de mergear |
| 🟡 **IMPORTANTE** | `[IMPORTANTE]` | Problema real que debería resolverse, pero no es crítico | Idealmente sí, pero se puede acordar |
| 🔵 **SUGERENCIA** | `[SUGERENCIA]` | Mejora de calidad, legibilidad, o consistencia | No — queda a criterio del autor |
| ⚪ **NITPICK** | `[NITPICK]` | Detalle menor de estilo o naming | No — solo mencionarlo |

```
Ejemplo de feedback bien clasificado:

[BLOQUEANTE] Línea 45: el input `userId` se interpola directamente en la query SQL.
Esto es SQL injection. Usar parameterized query: db.execute("... WHERE id = ?", [userId])

[IMPORTANTE] Línea 78: no hay guard para el caso null. Si getUser retorna null,
la línea 79 lanza TypeError en runtime. Agregar: if (!user) throw new NotFoundError()

[SUGERENCIA] Línea 12: la variable `d` podría llamarse `deletedAt` para mayor claridad.

[NITPICK] Línea 3: import no usado (UserRole). Puede eliminarse.
```

---

## FASE 4 — Formato del feedback

### 4.1 Estructura de cada observación

```
[NIVEL] Archivo:línea — descripción del problema
Impacto: qué puede pasar si esto no se corrige
Dirección de solución: cómo resolverlo (no necesariamente el código exacto)
```

### 4.2 Lo que el feedback NO debe ser

```
❌ Vago: "Esto podría ser más claro."
❌ Personal: "Yo haría esto diferente."
❌ Sin contexto: "Bad practice."
❌ Masivo sin clasificar: 20 observaciones mezcladas sin prioridad.
❌ Destructivo: "Este código es un desastre."
```

```
✅ Concreto: "La función tiene 3 responsabilidades distintas (validación, persistencia, email).
              Separarlas facilita el testing y reduce el blast radius de cambios futuros."
✅ Basado en impacto: "Esto puede fallar silenciosamente en producción porque..."
✅ Orientado a solución: "Una forma de resolverlo sería..."
```

### 4.3 Cuando el código está bien

Decirlo explícitamente. El silencio no es aprobación — es ambigüedad.

```
✅ "El manejo de errores en esta sección está bien estructurado."
✅ "El diseño de esta abstracción es limpio y fácil de extender."
✅ "Aprobado. Sin observaciones bloqueantes."
```

---

## FASE 5 — Veredicto final

```
REPORTE DE REVISIÓN
====================
Código revisado: [archivo(s) o descripción del PR]

Observaciones:
[BLOQUEANTE] x N
[IMPORTANTE] x N
[SUGERENCIA] x N
[NITPICK] x N

Veredicto: APROBADO / APROBADO CON CAMBIOS MENORES / RECHAZADO

Razón del veredicto:
[Si RECHAZADO: cuáles son los bloqueantes específicos]
[Si APROBADO CON CAMBIOS: qué debe resolverse]
[Si APROBADO: confirmación explícita]
```

---

## Checklist de revisión — antes de dar el veredicto

- [ ] Leí el código completo antes de comentar
- [ ] Entendí el contexto y propósito del cambio
- [ ] Verifiqué el checklist de seguridad completo
- [ ] Revisé los casos edge de la lógica principal
- [ ] Clasifiqué cada observación con su nivel
- [ ] El feedback es concreto, con impacto y dirección de solución
- [ ] El veredicto es explícito y justificado

---

*Skill universal — compatible con cualquier stack o proyecto*
*Para convenciones específicas del proyecto actual, consultar la skill de contexto del proyecto*
