---
name: deepseek-architect
description: >
  Protocolo de diseño arquitectónico y evolución de código para DeepSeek R1.
  Activar SIEMPRE antes de crear algo nuevo y complejo (múltiples módulos,
  capas, o integraciones), y SIEMPRE al refactorizar, optimizar performance,
  o extender features en código existente. Cubre: diseño de contratos entre
  capas, estructura de módulos, decisiones justificadas, refactor seguro,
  optimización sin regresiones, y extensión sin romper. Complementa
  deepseek-reasoning y deepseek-code-quality.
---

# DeepSeek Architect Skill — Universal

> **Si deepseek-reasoning te enseña cómo leer el proyecto, esta skill te enseña cómo diseñar la solución.**
> Antes de escribir código complejo, o antes de tocar código que ya funciona, hay una fase de diseño obligatoria.

---

## Cuándo activar esta skill

**Escenario A — Creación compleja:**
Vas a crear algo que involucra más de un archivo nuevo, múltiples capas, o integración entre módulos que no existen. Una función simple no requiere esta skill. Un servicio nuevo con su schema, lógica, y endpoint sí.

**Escenario B — Evolución de código existente:**
Vas a refactorizar, optimizar performance, o extender una feature en código que ya funciona y tiene usuarios o dependencias reales.

> **Regla de oro:** Si te equivocás en el diseño, escribís código correcto para el problema incorrecto. Si te equivocás en el refactor, rompés algo que funcionaba. Ambos casos requieren pensar antes de ejecutar.

---

## FASE A — Diseño Arquitectónico (para creación compleja)

### A.1 Definir los límites del sistema

Antes de pensar en implementación, definí exactamente qué entra y qué sale:

```
LÍMITES DEL SISTEMA
===================
Nombre del componente/servicio: [nombre]

Inputs:
- [qué recibe, de dónde, en qué formato]

Outputs:
- [qué produce, hacia dónde, en qué formato]

Efectos secundarios esperados:
- [qué modifica en el mundo: DB, cache, emails, eventos, etc.]

Lo que NO hace (explícito):
- [lista — definir el límite negativo evita scope creep]
```

No podés diseñar bien lo que no está acotado.

### A.2 Identificar las capas necesarias

Un sistema bien diseñado separa responsabilidades. Identificá cuántas capas necesitás y cuál es la única responsabilidad de cada una:

| Capa | Responsabilidad única | Ejemplos |
|---|---|---|
| **Presentación / API** | Recibir input, validar formato, devolver respuesta | Endpoints HTTP, handlers, resolvers |
| **Lógica de negocio** | Tomar decisiones, aplicar reglas | Services, use cases, domain logic |
| **Acceso a datos** | Leer y escribir en el sistema de persistencia | Repositories, queries, models |
| **Infraestructura** | Comunicarse con el mundo externo | Email, storage, third-party APIs |

> **Error documentado:** Mezclar lógica de negocio con acceso a datos en el mismo módulo produce código que no puede ser testeado ni reutilizado. Siempre separar.

**Regla:** Si una capa hace dos cosas de columnas diferentes en la tabla, es dos capas.

### A.3 Diseñar los contratos entre capas

Un contrato es la interfaz pública que una capa expone a la siguiente. Diseñalos antes de implementar:

```typescript
// ✅ CORRECTO — diseño el contrato antes de implementar

// Contrato de la capa de datos
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// Contrato de la capa de servicio
interface UserService {
  register(email: string, password: string): Promise<{ userId: string }>;
  authenticate(email: string, password: string): Promise<{ token: string }>;
}

// La capa de API solo conoce UserService — no sabe que existe UserRepository
```

```typescript
// ❌ WRONG — la API habla directamente con la DB
// El endpoint hace queries SQL directamente
// Imposible cambiar la DB, imposible testear la lógica
```

**Preguntas para cada contrato:**
- ¿Qué necesita saber quien llama? ¿Qué no necesita saber?
- ¿El método hace una sola cosa?
- ¿El nombre del método describe el intent de negocio o el detalle de implementación?

### A.4 Identificar los puntos de falla

Antes de implementar, pensá en qué puede salir mal:

```
MAPA DE PUNTOS DE FALLA
========================
Integración con DB:
- ¿Qué pasa si la query falla?
- ¿Qué pasa si retorna null cuando se esperaba un registro?

Integración externa (API, email, storage):
- ¿Qué pasa si el servicio externo no responde?
- ¿Qué pasa si responde con error?
- ¿La operación es idempotente? ¿Podemos reintentar?

Validación de input:
- ¿Qué inputs inválidos pueden llegar?
- ¿Los validamos antes de procesar o después?

Estado compartido:
- ¿Hay condiciones de carrera posibles?
- ¿Necesitamos transacciones?
```

Un punto de falla no mapeado es un bug garantizado en producción.

### A.5 Plan arquitectónico final

```
PLAN ARQUITECTÓNICO
===================
Componente: [nombre]

Capas:
1. [nombre de capa] — [responsabilidad única]
   Archivos: [lista]
   Contrato público: [métodos/endpoints que expone]

2. [nombre de capa] — [responsabilidad única]
   Archivos: [lista]
   Contrato público: [métodos que expone]

Flujo principal:
[descripción del camino feliz paso a paso]

Flujos de error:
[descripción de cada punto de falla y cómo se maneja]

Decisiones de diseño:
- [decisión]: [justificación] — Alternativa descartada: [por qué no]
```

El campo "alternativa descartada" es obligatorio. Si no podés justificar por qué no elegiste la alternativa obvia, no estás listo para implementar.

---

## FASE B — Evolución Segura de Código Existente

### B.1 Entender el código antes de tocarlo

```
❌ WRONG: "Veo que esta función es larga, la refactorizo."
✅ CORRECT: Leer la función completa, entender POR QUÉ está como está, luego decidir.
```

Antes de cualquier cambio en código existente:

1. **Leer el archivo completo** — no solo las líneas que parecen relevantes.
2. **Identificar los invariantes** — las condiciones que el código garantiza actualmente y que no deben romperse.
3. **Identificar quién depende de este código** — todos los archivos que lo importan o llaman.
4. **Identificar el comportamiento observable** — qué produce actualmente para cada input relevante.

> **Principio:** El comportamiento observable es un contrato implícito. Cambiarlo sin saberlo es introducir un bug.

### B.2 Clasificar el tipo de cambio

Cada tipo de cambio tiene riesgos y reglas distintas:

| Tipo | Descripción | Riesgo principal |
|---|---|---|
| **Refactor** | Misma funcionalidad, mejor estructura interna | Romper comportamiento existente |
| **Optimización** | Misma funcionalidad, mejor performance | Introducir bugs sutiles por asumir que la lógica es equivalente |
| **Extensión** | Nueva funcionalidad en código existente | Romper casos existentes, aumentar complejidad |
| **Migración** | Cambiar tecnología o librería subyacente | Diferencias de comportamiento entre implementaciones |

Identificar el tipo antes de actuar define las reglas que aplican.

### B.3 Refactoring — reglas obligatorias

```
REGLA 1: Un refactor no cambia comportamiento observable.
Si cambia algo que el llamador puede detectar, no es refactor — es un cambio de contrato.

REGLA 2: Un refactor a la vez.
No refactorices múltiples funciones en el mismo commit. Si algo se rompe, no sabés cuál fue.

REGLA 3: El nombre nuevo debe ser más claro que el anterior, o no cambiarlo.
Renombrar por renombrar es ruido.
```

```typescript
// ❌ WRONG — "refactor" que cambia comportamiento
// Antes:
function getUser(id: string) {
  return db.query("SELECT * FROM users WHERE id = ?", [id]);
  // Retornaba array de filas
}

// Después del "refactor":
function getUser(id: string) {
  return db.query("SELECT * FROM users WHERE id = ?", [id]).then(rows => rows[0]);
  // Ahora retorna una fila o undefined — cambió el contrato
}
// Todos los llamadores esperaban un array y ahora reciben undefined — bug silencioso

// ✅ CORRECT — el refactor preserva el contrato
function getUserRows(id: string): Promise<UserRow[]> {
  return db.query<UserRow[]>("SELECT * FROM users WHERE id = ?", [id]);
}
// Si querés la versión que retorna uno solo, es una función nueva con nombre diferente
```

### B.4 Optimización — reglas obligatorias

```
REGLA 1: Medir antes de optimizar.
Si no tenés evidencia de que esta parte es el bottleneck, no la optimizás.
La optimización prematura introduce complejidad sin beneficio medible.

REGLA 2: Documentar qué se está optimizando y por qué.
Un comentario que explica la decisión de performance evita que alguien la revierta sin entender.

REGLA 3: Verificar que el resultado es idéntico, no "equivalente".
"Debería dar lo mismo" es una suposición. Verificala.
```

```typescript
// ✅ CORRECT — optimización documentada y acotada
// ANTES: O(n²) — iteración anidada sobre ambas listas
// DESPUÉS: O(n) — pre-indexamos por id para lookup O(1)
// Medido: reducción de 340ms → 12ms en dataset de producción (10k items)
const itemsById = new Map(items.map(item => [item.id, item]));
const enriched = orders.map(order => ({
  ...order,
  item: itemsById.get(order.itemId) ?? null,
}));
```

### B.5 Extensión de features — reglas obligatorias

```
REGLA 1: Extender, no modificar.
Preferir agregar comportamiento nuevo sin cambiar el comportamiento existente.
Open/Closed Principle: abierto a extensión, cerrado a modificación.

REGLA 2: Los casos existentes son inviolables.
Antes de agregar la feature, listá todos los casos existentes que deben seguir funcionando.
Si tu cambio los rompe, rediseñá el cambio — no los casos existentes.

REGLA 3: No aumentar la complejidad ciclomática innecesariamente.
Cada `if` nuevo en una función existente es deuda potencial. Considerá si la nueva lógica debería vivir en una función separada.
```

```typescript
// ❌ WRONG — extensión que contamina la función existente
async function getItems(userId: string, includeArchived?: boolean, filterByTag?: string, sortBy?: string) {
  // Función que antes era simple ahora maneja 4 casos diferentes
  // Cada nuevo parámetro es una bifurcación más
}

// ✅ CORRECT — extensión por composición
async function getItems(userId: string): Promise<Item[]> {
  // La función original no cambia
  return db.query("SELECT * FROM items WHERE user_id = ? AND archived_at IS NULL", [userId]);
}

async function getItemsWithOptions(userId: string, options: GetItemsOptions): Promise<Item[]> {
  // La nueva funcionalidad vive en una función nueva
  // Llama a la original o reimplementa si el caso lo requiere
}
```

### B.6 Verificación post-cambio

Después de cualquier cambio en código existente:

```
VERIFICACIÓN DE EVOLUCIÓN
==========================
Comportamiento preservado:
- [ ] Los inputs que antes funcionaban siguen funcionando
- [ ] Los outputs para esos inputs son idénticos (no "equivalentes")
- [ ] Los errores que antes se lanzaban siguen lanzándose con el mismo tipo

Contratos verificados:
- [ ] La firma pública de las funciones modificadas no cambió
  (o si cambió, todos los llamadores fueron actualizados)
- [ ] Los tipos de retorno son los mismos
- [ ] Los side effects son los mismos

Dependencias verificadas:
- [ ] Todos los archivos que importan este módulo siguen compilando
- [ ] No hay imports rotos en ninguna dirección

Documentación:
- [ ] Si la razón del cambio no es obvia, hay un comentario que la explica
- [ ] Si se descartó una alternativa, está documentado por qué
```

---

## FASE C — Decisiones de Diseño Documentadas

### C.1 Registrar las decisiones no obvias

Las decisiones de diseño que no se documentan se vuelven a debatir cada vez que alguien lee el código. Una línea de comentario evita horas de confusión futura.

```typescript
// ✅ CORRECT — decisión documentada
// Usamos soft delete en lugar de DELETE físico para preservar
// integridad referencial en audit_logs. Ver ADR-004.
await db.execute(
  "UPDATE items SET deleted_at = NOW() WHERE id = ?",
  [itemId]
);
```

```typescript
// ✅ CORRECT — alternativa descartada documentada
// NOTE: Consideramos usar un job queue para esto, pero la latencia
// del procesamiento síncro es aceptable (<50ms) y simplifica
// el modelo operacional. Revisar si el volumen supera 1000 req/min.
await processItemSync(item);
```

### C.2 Las tres preguntas de diseño

Antes de confirmar cualquier decisión arquitectónica importante, respondé:

1. **¿Qué problema resuelve esto exactamente?**
   Si la respuesta es vaga, el diseño es prematuro.

2. **¿Cuál es la alternativa más simple que podría funcionar?**
   Si la alternativa simple funciona, usala. La complejidad se agrega cuando hay evidencia de que es necesaria.

3. **¿Cuándo esta decisión se vuelve incorrecta?**
   Toda decisión tiene un contexto en el que es la correcta. Identificarlo ayuda a saber cuándo revisarla.

---

## Checklist rápido — antes de diseñar o evolucionar

### Para creación compleja (Fase A)
- [ ] Los límites del sistema están definidos (input, output, efectos, límite negativo)
- [ ] Cada capa tiene una responsabilidad única y clara
- [ ] Los contratos entre capas están diseñados antes de implementar
- [ ] Los puntos de falla están identificados con su manejo definido
- [ ] Las decisiones de diseño principales tienen alternativa descartada documentada

### Para evolución de código existente (Fase B)
- [ ] Leí el archivo completo antes de cualquier cambio
- [ ] Identifiqué los invariantes del código actual
- [ ] Clasifiqué el tipo de cambio (refactor / optimización / extensión / migración)
- [ ] El comportamiento observable se preserva
- [ ] Los casos existentes fueron verificados
- [ ] Los contratos públicos no cambiaron (o todos los llamadores fueron actualizados)
- [ ] Las decisiones no obvias tienen comentario explicativo

---

*Skill universal — compatible con cualquier stack o proyecto*
*Para decisiones específicas del stack actual, consultar la skill de contexto del proyecto*
