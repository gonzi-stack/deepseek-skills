---
name: deepseek-performance
description: >
  Protocolo de análisis y optimización de performance para DeepSeek R1.
  Activar SIEMPRE al investigar lentitud, alto uso de memoria, o degradación
  bajo carga. También al diseñar funcionalidades que manejan volúmenes grandes
  de datos, requests concurrentes, o recursos costosos. Cubre: identificación
  de bottlenecks reales, N+1 queries, estrategias de caching, optimización
  de queries, memory leaks, y concurrencia. No optimizar sin medir primero.
  Complementa deepseek-architect y deepseek-debug.
---

# DeepSeek Performance Skill — Universal

> **La optimización prematura es la raíz de todos los males. La optimización tardía es la raíz de los incidentes en producción.**
> El camino correcto: medir → identificar el bottleneck real → optimizar ese bottleneck → medir de nuevo.

---

## Principio fundamental

> **Nunca optimizar lo que no mediste.**
> Cada optimización sin medición previa es una apuesta. A veces mejora algo irrelevante.
> Siempre tiene un costo: complejidad, mantenibilidad, legibilidad.

```
El ciclo correcto:
SÍNTOMA → MEDIR → BOTTLENECK REAL → HIPÓTESIS → OPTIMIZAR → MEDIR DE NUEVO

❌ El ciclo incorrecto:
SÍNTOMA → INTUICIÓN → OPTIMIZAR ALGO → ASUMIR QUE MEJORÓ
```

---

## FASE 1 — Identificar el bottleneck real

### 1.1 Clasificar el síntoma antes de actuar

| Síntoma | Posibles causas | Dónde buscar primero |
|---|---|---|
| Request lento (>500ms) | N+1 queries, query sin índice, cómputo pesado, llamada externa | Logs de queries, tiempo de cada operación |
| Alto uso de CPU | Cómputo en el thread principal, loops costosos, serialización | Profiler de CPU |
| Alto uso de memoria | Leak de memoria, carga de datasets grandes, cache sin límite | Profiler de memoria, heap snapshots |
| Degradación bajo carga | Contención de recursos, pool de conexiones agotado, lock contention | Métricas de concurrencia |
| Lentitud progresiva | Memory leak, acumulación de datos, índices fragmentados | Tendencia en el tiempo |

### 1.2 Medir antes de tocar nada

```typescript
// Para identificar dónde se va el tiempo en un request:
const t0 = performance.now();

const user = await userRepo.getById(id);      // ¿cuánto tarda esto?
const t1 = performance.now();

const orders = await orderRepo.getByUser(id); // ¿y esto?
const t2 = performance.now();

const enriched = await enrichOrders(orders);  // ¿y esto?
const t3 = performance.now();

console.log({
  getUser: t1 - t0,
  getOrders: t2 - t1,
  enrich: t3 - t2,
  total: t3 - t0,
});
// Solo después de ver estos números sabés qué optimizar
```

### 1.3 Documentar la baseline antes de optimizar

```
BASELINE DE PERFORMANCE
========================
Fecha: [fecha]
Entorno: [local / staging / producción]
Condición: [carga normal / bajo carga / caso específico]

Métrica              Valor actual    Objetivo
─────────────────────────────────────────────
Tiempo de respuesta  [ms]            [ms]
Queries ejecutadas   [N]             [N]
Memoria usada        [MB]            [MB]
CPU %                [%]             [%]

Método de medición: [cómo mediste]
```

Sin baseline no podés saber si la optimización funcionó.

---

## FASE 2 — N+1 Queries (el problema más común)

### 2.1 Identificar N+1

Un N+1 ocurre cuando ejecutás 1 query para obtener una lista y luego N queries para enriquecer cada elemento.

```typescript
// ❌ CLASSIC N+1 — 1 query para orders + N queries para items
const orders = await db.query("SELECT * FROM orders WHERE user_id = ?", [userId]);
// hasta aquí: 1 query ✓

for (const order of orders) {
  order.items = await db.query(
    "SELECT * FROM order_items WHERE order_id = ?",
    [order.id]
  );
  // aquí: +1 query por cada order → si hay 100 orders, son 101 queries
}
```

**Cómo detectarlo:**
- Logs de queries muestran el mismo patrón repetido N veces con IDs diferentes
- El tiempo total escala linealmente con el número de registros

### 2.2 Soluciones al N+1

**Opción A — JOIN (cuando la relación es simple)**

```typescript
// ✅ 1 query con JOIN
const rows = await db.query(`
  SELECT
    o.id as order_id,
    o.created_at,
    oi.id as item_id,
    oi.name,
    oi.quantity
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.user_id = ?
  ORDER BY o.created_at DESC
`, [userId]);

// Agrupar en la aplicación
const ordersMap = new Map<string, Order>();
for (const row of rows) {
  if (!ordersMap.has(row.order_id)) {
    ordersMap.set(row.order_id, { id: row.order_id, items: [] });
  }
  ordersMap.get(row.order_id)!.items.push({ id: row.item_id, ... });
}
```

**Opción B — Batch query (cuando el JOIN es costoso o complejo)**

```typescript
// ✅ 2 queries en total, independientemente de cuántos orders haya
const orders = await db.query(
  "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
  [userId]
);

const orderIds = orders.map(o => o.id);

const items = await db.query(
  `SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => "?").join(",")})`,
  orderIds
);

// Indexar items por order_id para lookup O(1)
const itemsByOrderId = new Map<string, Item[]>();
for (const item of items) {
  if (!itemsByOrderId.has(item.order_id)) {
    itemsByOrderId.set(item.order_id, []);
  }
  itemsByOrderId.get(item.order_id)!.push(item);
}

const enriched = orders.map(order => ({
  ...order,
  items: itemsByOrderId.get(order.id) ?? [],
}));
```

---

## FASE 3 — Optimización de Queries

### 3.1 Señales de una query lenta

```sql
-- ❌ Sin índice en columna de filtro frecuente
SELECT * FROM events WHERE user_id = ? AND created_at > ?
-- Si user_id no tiene índice, full table scan en cada request

-- ❌ SELECT * cuando solo necesitás 2 columnas
SELECT * FROM users WHERE id = ?
-- Transfiere columnas innecesarias, incluyendo potencialmente campos grandes

-- ❌ Sin LIMIT en queries de lista
SELECT * FROM logs WHERE service = ?
-- Puede retornar millones de filas

-- ❌ ORDER BY en columna sin índice sobre tabla grande
SELECT * FROM orders ORDER BY total DESC LIMIT 10
-- Full table scan + sort
```

### 3.2 Patrones de optimización de queries

**Índices:**
```sql
-- Agregar índice en columnas que aparecen frecuentemente en WHERE, JOIN, ORDER BY
CREATE INDEX idx_events_user_created ON events(user_id, created_at DESC);

-- Índice parcial para queries con condición fija (ej: soft delete)
CREATE INDEX idx_orders_active ON orders(user_id, created_at)
  WHERE deleted_at IS NULL;
```

**Paginación:**
```typescript
// ❌ WRONG — offset-based paginación se degrada en páginas profundas
"SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 10000"
// La DB lee 10020 filas y descarta 10000

// ✅ CORRECT — cursor-based paginación, O(log n) consistente
"SELECT * FROM orders WHERE created_at < ? ORDER BY created_at DESC LIMIT 20"
// La DB usa el índice directamente
```

**Proyección correcta:**
```typescript
// ❌ Para una lista de preview, no traer el contenido completo
"SELECT id, title, content, metadata, attachments FROM posts WHERE user_id = ?"

// ✅ Solo lo necesario para el caso de uso
"SELECT id, title, created_at, status FROM posts WHERE user_id = ? LIMIT 50"
```

### 3.3 EXPLAIN antes de asumir que una query es óptima

```sql
-- Verificar que la query usa índices y no hace full table scan
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = ? AND status = 'active';

-- Buscar en el output:
-- ✅ "Index Scan" o "Index Only Scan" — usa el índice
-- ❌ "Seq Scan" en tabla grande — full table scan, revisar índices
-- ❌ "Sort" sin índice — ordenamiento en memoria
```

---

## FASE 4 — Caching

### 4.1 Cuándo cachear y cuándo no

```
Cachear:
✅ Datos que cambian raramente y se leen frecuentemente (configuración, catálogos)
✅ Resultados de cómputo costoso y determinista (mismos inputs → mismo output)
✅ Datos de APIs externas con rate limits
✅ Resultados de queries pesadas que son el bottleneck medido

No cachear:
❌ Datos que requieren consistencia inmediata (saldos, inventario en tiempo real)
❌ Datos personalizados por usuario si la clave de cache no incluye el userId
❌ Sin una estrategia de invalidación clara
❌ Como solución a un N+1 que debería resolverse con batch queries
```

### 4.2 Estrategias de caching

**Cache en memoria (request-scoped):**
```typescript
// ✅ Para evitar llamadas repetidas dentro del mismo request
// Sin dependencias externas, sin invalidación necesaria
const cache = new Map<string, User>();

async function getUserCached(id: string): Promise<User | null> {
  if (cache.has(id)) return cache.get(id)!;
  const user = await userRepo.getById(id);
  if (user) cache.set(id, user);
  return user;
}
// El cache vive solo durante el request — se descarta automáticamente
```

**Cache distribuido (Redis / Upstash):**
```typescript
// ✅ Para datos compartidos entre requests y servidores
async function getConfig(key: string): Promise<Config> {
  const cached = await redis.get(`config:${key}`);
  if (cached) return JSON.parse(cached);

  const config = await configRepo.getByKey(key);

  // TTL explícito — el cache expira aunque no se invalide manualmente
  await redis.set(`config:${key}`, JSON.stringify(config), { ex: 3600 });

  return config;
}
```

### 4.3 Invalidación de cache — la parte difícil

```typescript
// ✅ Invalidar cuando los datos cambian
async function updateUserProfile(id: string, data: UpdateProfileParams) {
  await userRepo.update(id, data);

  // Invalidar el cache del usuario modificado
  await redis.del(`user:${id}`);
  // Si hay variantes del cache (ej: por email), invalidad todas
  await redis.del(`user:email:${data.email}`);
}
```

```
Reglas de invalidación:
1. Siempre invalidar en la misma transacción o inmediatamente después de la escritura
2. Preferir TTL cortos sobre invalidación manual para datos semi-dinámicos
3. Documentar qué eventos invalidan cada clave de cache
4. Cache stampede: si muchos requests llegan cuando el cache expiró, usar locks
```

---

## FASE 5 — Memory Leaks

### 5.1 Patrones que causan memory leaks

```typescript
// ❌ Listeners que no se limpian
class EventProcessor {
  init() {
    eventEmitter.on("data", this.handleData); // se registra N veces si init() se llama N veces
  }
  // Sin cleanup → el listener nunca se elimina
}

// ✅ Limpiar siempre los listeners
class EventProcessor {
  init() {
    eventEmitter.on("data", this.handleData);
  }
  destroy() {
    eventEmitter.off("data", this.handleData); // cleanup explícito
  }
}
```

```typescript
// ❌ Cache sin límite de tamaño
const cache = new Map(); // crece indefinidamente
function remember(key: string, value: any) {
  cache.set(key, value);
}

// ✅ Cache con límite (LRU pattern)
import { LRUCache } from "lru-cache";
const cache = new LRUCache({ max: 1000 }); // máximo 1000 entradas
```

```typescript
// ❌ Closures que retienen referencias grandes
function processLargeDataset(data: LargeObject[]) {
  const summary = data.map(d => d.id); // solo necesitás los IDs
  return () => summary; // pero el closure retiene toda la función que creó summary
  // si data es enorme, persiste en memoria mientras el closure exista
}

// ✅ Retener solo lo necesario
function processLargeDataset(data: LargeObject[]) {
  const ids = data.map(d => d.id); // solo los IDs
  data = null!; // liberar la referencia explícitamente si es posible
  return () => ids;
}
```

### 5.2 Señales de memory leak

```
🚩 Uso de memoria que crece continuamente sin estabilizarse
🚩 El GC corre cada vez más frecuentemente (visible en métricas)
🚩 La aplicación se vuelve más lenta con el tiempo y reiniciar la resuelve
🚩 Heap snapshots tomados en el tiempo muestran objetos acumulándose
```

---

## FASE 6 — Concurrencia y recursos compartidos

### 6.1 Pool de conexiones

```typescript
// ❌ Nueva conexión por request — agota los recursos del servidor de DB
async function handler(req) {
  const connection = await mysql.createConnection(config);
  const result = await connection.query("...");
  await connection.end();
  return result;
}

// ✅ Pool compartido — reutiliza conexiones
// El pool se inicializa una vez al arrancar el proceso
const pool = mysql.createPool({ ...config, connectionLimit: 10 });

async function handler(req) {
  const result = await pool.execute("..."); // obtiene conexión del pool, la devuelve al terminar
  return result;
}
```

### 6.2 Operaciones independientes en paralelo

```typescript
// ❌ WRONG — operaciones independientes en serie innecesariamente
async function getDashboardData(userId: string) {
  const user = await userRepo.getById(userId);       // espera
  const orders = await orderRepo.getByUser(userId);  // espera
  const stats = await statsRepo.getByUser(userId);   // espera
  // tiempo total: t(user) + t(orders) + t(stats)
}

// ✅ CORRECT — operaciones independientes en paralelo
async function getDashboardData(userId: string) {
  const [user, orders, stats] = await Promise.all([
    userRepo.getById(userId),
    orderRepo.getByUser(userId),
    statsRepo.getByUser(userId),
  ]);
  // tiempo total: max(t(user), t(orders), t(stats))
}
```

```
Regla: Promise.all solo para operaciones verdaderamente independientes.
Si el resultado de A es input de B, deben ir en serie.
Si A y B no tienen relación, van en paralelo.
```

### 6.3 Race conditions

```typescript
// ❌ WRONG — check-then-act sin atomicidad
const existing = await userRepo.findByEmail(email);
if (!existing) {
  await userRepo.create({ email }); // otro request puede crear entre estas dos líneas
}

// ✅ CORRECT — constraint de unicidad en la DB + manejo del error
try {
  await userRepo.create({ email });
} catch (error) {
  if (isUniqueConstraintViolation(error)) {
    throw new ConflictError("Email already registered");
  }
  throw error;
}
```

---

## FASE 7 — Documentar la optimización

Toda optimización no obvia debe documentarse:

```typescript
// ✅ CORRECTO — la optimización y su razón están documentadas
// PERF: pre-indexamos por ID para lookup O(1) en lugar de O(n) por item.
// Medido: 180ms → 8ms en dataset de producción (5k orders, ~15k items).
// Revisitar si los items por order crecen significativamente (actualmente promedio 3).
const itemsByOrderId = new Map(items.map(item => [item.order_id, item]));
```

```
Formato de documentación de performance:
// PERF: [qué se optimizó] — de O(X) a O(Y)
// Medido: [antes] → [después] en [condición de medición]
// Trade-off: [qué se sacrificó, si algo]
// Revisitar cuando: [condición bajo la cual esta decisión cambia]
```

---

## Checklist de performance — antes de cerrar una optimización

### Diagnóstico
- [ ] Medí el problema antes de optimizar (tengo la baseline)
- [ ] Identifiqué el bottleneck real (no el que asumí)
- [ ] El cambio ataca el bottleneck real, no un síntoma secundario

### Implementación
- [ ] Las queries tienen índices en las columnas de filtro y ordenamiento
- [ ] No hay N+1 queries (sin queries dentro de loops)
- [ ] Las operaciones independientes se ejecutan en paralelo
- [ ] El cache tiene TTL o estrategia de invalidación definida
- [ ] No hay listeners o recursos que queden sin limpiar

### Verificación
- [ ] Medí el resultado después de la optimización
- [ ] La métrica mejoró respecto a la baseline
- [ ] No introduje regresiones en otras métricas (ej: mejoré CPU pero aumenté memoria)
- [ ] La optimización está documentada con su razón y trade-offs

---

*Skill universal — compatible con cualquier stack o proyecto*
*Para herramientas de profiling específicas del stack actual, consultar la skill de contexto del proyecto*
