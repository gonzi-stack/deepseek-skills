---
name: deepseek-code-quality
description: >
  Estándares de calidad de código obligatorios para DeepSeek R1.
  Activar SIEMPRE junto con deepseek-reasoning antes de escribir cualquier código.
  Cubre principios universales: tipos seguros, funciones bien diseñadas, queries
  seguras, seguridad, error handling, y React/componentes de calidad. Compatible
  con cualquier stack — los principios se adaptan al lenguaje del proyecto.
---

# DeepSeek Code Quality Skill — Universal

> **Si deepseek-reasoning te enseña cómo pensar, esta skill te enseña cómo escribir.**
> Los principios son universales. Los ejemplos usan TypeScript pero aplican a cualquier lenguaje tipado.

---

## 1. Tipos — Escribir código que se defiende solo

### 1.1 Nunca evadir el sistema de tipos

`any`, casts forzados, y type assertions son una rendición. Siempre existe un tipo correcto.

```typescript
// ❌ WRONG — evadiendo el sistema de tipos
const result = (api.user as any).listItems?.();

// ✅ CORRECT — usando el tipo real
const result = api.user.listItems();
```

Si el compilador se queja, el problema es el tipo — no el cast. Leé el error, encontrá el tipo correcto.

**Alternativas a `any`:**
- `unknown` — cuando el tipo es genuinamente desconocido; manejalo con type guards
- Generics — cuando el tipo varía pero es predecible
- Tipos de unión explícitos — cuando puede ser una de varias cosas conocidas

### 1.2 Tipos de retorno explícitos en funciones públicas

Las funciones que forman parte de la API de un módulo deben declarar su tipo de retorno:

```typescript
// ❌ WRONG — el lector no sabe qué esperar
async function getUserById(id: string) {
  // ...
}

// ✅ CORRECT — contrato claro
async function getUserById(id: string): Promise<User | null> {
  // ...
}
```

### 1.3 Guards para valores potencialmente nulos

Antes de acceder a una propiedad, verificar que el objeto existe:

```typescript
// ❌ WRONG — crash si rows[0] no existe
const user = rows[0];
return user.name;

// ✅ CORRECT
const user = rows[0];
if (!user) return null;
return user.name;

// ✅ CORRECT — alternativa concisa
return rows[0]?.name ?? null;
```

### 1.4 Estados explícitos en lugar de booleans ambiguos

```typescript
// ❌ WRONG — ¿isActive: false significa suspendido? ¿eliminado? ¿bloqueado?
interface Resource {
  isActive: boolean;
}

// ✅ CORRECT — el estado es inequívoco
interface Resource {
  status: "active" | "suspended" | "deleted" | "pending";
}
```

### 1.5 Validación de inputs en los boundaries del sistema

Todo input que viene de fuera (HTTP, usuario, archivo, API externa) debe ser validado antes de usarse:

```typescript
// ❌ WRONG — usa el input directamente
async function handler(req: Request) {
  const { id, role } = await req.json();
  await updateUser(id, role);
}

// ✅ CORRECT — valida primero
const schema = z.object({
  id: z.string().uuid(),
  role: z.enum(["viewer", "editor", "admin"]),
});

async function handler(req: Request) {
  const body = schema.parse(await req.json());
  await updateUser(body.id, body.role);
}
```

---

## 2. Funciones — Principios de Diseño

### 2.1 Una función, una responsabilidad

```typescript
// ❌ WRONG — valida, persiste, envía email, y loguea
async function createUser(email: string, password: string) {
  if (!email.includes("@")) throw new Error("Invalid email");
  const id = crypto.randomUUID();
  await db.insert("users", { id, email });
  await sendWelcomeEmail(email);
  console.log(`User created: ${id}`);
  return id;
}

// ✅ CORRECT — cada función hace una cosa
async function createUser(email: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.insert("users", { id, email });
  return id;
}
// La validación va en el schema de input
// El email lo dispara quien llama a createUser
```

### 2.2 Early returns — nunca anidar innecesariamente

```typescript
// ❌ WRONG — pirámide de indentación
async function getResourceForUser(resourceId: string, userId: string) {
  const resource = await getById(resourceId);
  if (resource) {
    if (resource.ownerId === userId) {
      if (resource.status !== "error") {
        return resource;
      } else {
        throw new Error("Resource in error state");
      }
    } else {
      throw new Error("Forbidden");
    }
  } else {
    throw new Error("Not found");
  }
}

// ✅ CORRECT — flat, legible, directo
async function getResourceForUser(resourceId: string, userId: string) {
  const resource = await getById(resourceId);
  if (!resource) throw new NotFoundError(resourceId);
  if (resource.ownerId !== userId) throw new ForbiddenError();
  if (resource.status === "error") throw new ResourceErrorError(resourceId);
  return resource;
}
```

### 2.3 Nombres que describen intención

```typescript
// ❌ WRONG — ¿qué es data? ¿qué es result? ¿qué es temp?
const data = await db.query(...);
const result = data[0];
const temp = result.map(r => r.id);

// ✅ CORRECT — cada variable dice qué es
const [userRows] = await db.query<UserRow[]>(...);
const userIds = userRows.map(row => row.id);
```

```typescript
// ❌ WRONG — nombres genéricos
async function get(id: string) { ... }
async function update(data: unknown) { ... }

// ✅ CORRECT — nombres que documentan
async function getUserById(id: string): Promise<User | null> { ... }
async function updateUserRole(id: string, role: UserRole): Promise<void> { ... }
```

### 2.4 Más de 3 parámetros → usar objeto

```typescript
// ❌ WRONG — orden confuso, fácil de mezclar
async function createItem(userId: string, categoryId: string, name: string, type: string, isPublic: boolean) { ... }

// ✅ CORRECT — parámetros nombrados, orden irrelevante
interface CreateItemParams {
  userId: string;
  categoryId: string;
  name: string;
  type: "physical" | "digital";
  isPublic: boolean;
}
async function createItem(params: CreateItemParams): Promise<string> { ... }
```

---

## 3. Queries y Acceso a Datos

### 3.1 Siempre parameterized queries — sin excepción

```typescript
// ❌ CRITICAL SECURITY VIOLATION — SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ CORRECT — parameterized
await db.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
```

Lo mismo aplica a cualquier query language: MongoDB, Elasticsearch, etc. Nunca interpolar input del usuario directamente.

### 3.2 Seleccionar solo las columnas necesarias

```typescript
// ❌ WRONG — trae todo, incluyendo campos sensibles
"SELECT * FROM users WHERE id = ?"

// ✅ CORRECT — solo lo necesario
"SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1"
```

### 3.3 LIMIT en todas las queries de lista

```typescript
// ❌ WRONG — puede traer millones de filas
"SELECT * FROM events"

// ✅ CORRECT — siempre bounded
"SELECT * FROM events ORDER BY created_at DESC LIMIT 100"
```

### 3.4 Transacciones para operaciones multi-step

```typescript
// ❌ WRONG — si el segundo paso falla, el primero quedó huérfano
await db.insert("orders", orderData);
await db.insert("order_items", itemsData);

// ✅ CORRECT — atómico
const connection = await db.getConnection();
try {
  await connection.beginTransaction();
  await connection.execute("INSERT INTO orders ...", [...]);
  await connection.execute("INSERT INTO order_items ...", [...]);
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

### 3.5 Soft deletes — nunca exponer datos eliminados

```typescript
// ❌ WRONG — muestra registros eliminados
"SELECT * FROM posts WHERE user_id = ?"

// ✅ CORRECT
"SELECT * FROM posts WHERE user_id = ? AND deleted_at IS NULL"
```

---

## 4. Seguridad — Reglas No Negociables

### 4.1 Nunca confiar en el input del cliente para ownership

```typescript
// ❌ WRONG — el cliente puede mandar cualquier userId
.handler(async ({ input }) => {
  await deleteItem(input.itemId, input.userId);
})

// ✅ CORRECT — el userId viene de la sesión autenticada
.handler(async ({ input, ctx }) => {
  const item = await getItemById(input.itemId);
  if (!item) throw new NotFoundError();
  if (item.ownerId !== ctx.session.userId) throw new ForbiddenError();
  await deleteItem(input.itemId);
})
```

### 4.2 Nunca loguear datos sensibles

```typescript
// ❌ CRITICAL SECURITY VIOLATION
console.log("Login attempt:", { email, password });
console.log("Session:", session);

// ✅ Si necesitás debug, logueá solo IDs o categorías
// Y borrá el log antes de hacer commit
```

### 4.3 Nunca credenciales hardcodeadas

```typescript
// ❌ CRITICAL SECURITY VIOLATION
const db = new Database({ password: "supersecret123" });
const apiKey = "sk-prod-abc123";

// ✅ CORRECT — siempre desde variables de entorno
const db = new Database({ password: env.DB_PASSWORD });
const apiKey = env.API_KEY;
```

### 4.4 IDs y tokens seguros

```typescript
// ❌ WRONG — predecible
const id = Math.random().toString(36);
const token = Date.now().toString();

// ✅ CORRECT — criptográficamente seguro
const id = crypto.randomUUID();
const token = crypto.getRandomValues(new Uint8Array(32));
```

---

## 5. Error Handling

### 5.1 Nunca silenciar errores

```typescript
// ❌ WRONG — el error desaparece silenciosamente
try {
  await riskyOperation();
} catch {
  // nada
}

// ✅ CORRECT — siempre manejar o re-lanzar
try {
  await riskyOperation();
} catch (error) {
  logger.error("riskyOperation failed", { error });
  throw new InternalError("Operation failed");
}
```

### 5.2 Errores semánticamente correctos

```typescript
// ❌ WRONG — 500 para todo
throw new Error("Something went wrong");

// ✅ CORRECT — el código HTTP/error describe el problema real
if (!resource) throw new NotFoundError(resourceId);
if (!hasPermission) throw new ForbiddenError();
if (alreadyExists) throw new ConflictError("email already taken");
```

### 5.3 No exponer detalles internos en errores de cliente

```typescript
// ❌ WRONG — expone estructura interna
throw new Error(`DB query failed: SELECT * FROM users WHERE id = '${id}'`);

// ✅ CORRECT — mensaje útil para el cliente, detalle en los logs
logger.error("DB query failed", { query, id, error });
throw new InternalError("Failed to fetch user");
```

---

## 6. Componentes UI (React / frameworks de componentes)

### 6.1 Componentes sin side effects innecesarios

```typescript
// ❌ WRONG — useEffect para derivar estado
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ CORRECT — derivar directamente
const fullName = `${firstName} ${lastName}`;
```

### 6.2 Hooks — siempre antes de cualquier return condicional

```typescript
// ❌ WRONG — viola las reglas de hooks
if (!session) return <Loading />;
const { data } = useQuery(...); // hook después de return

// ✅ CORRECT — todos los hooks primero
const { data: session } = useSession();
const { data } = useQuery(...);

if (!session) return <Loading />;
```

### 6.3 Feedback explícito en operaciones async

```typescript
// ❌ WRONG — el usuario no sabe qué pasó
<button onClick={() => void mutation.mutate()}>
  Eliminar
</button>

// ✅ CORRECT — estados explícitos
<button
  onClick={() => void mutation.mutate()}
  disabled={mutation.isPending}
>
  {mutation.isPending ? "Eliminando..." : "Eliminar"}
</button>
{mutation.isError && (
  <p className="text-red-500">{mutation.error.message}</p>
)}
```

---

## 7. Checklist de Calidad — Antes de Declarar Done

### Tipos y seguridad de tipos
- [ ] Sin casts forzados ni evasión del sistema de tipos
- [ ] Funciones públicas tienen tipos de retorno explícitos
- [ ] Guards para todos los accesos a valores potencialmente nulos
- [ ] Estados representados con tipos explícitos, no booleans ambiguos
- [ ] Inputs externos validados en el boundary

### Queries y datos
- [ ] Todas las queries usan parameterized statements
- [ ] SELECT lista columnas específicas, no `*`
- [ ] Todas las queries de lista tienen LIMIT
- [ ] Operaciones multi-step usan transacciones con rollback
- [ ] Soft delete filtrado en queries relevantes

### Seguridad
- [ ] Sin debug statements en código de producción
- [ ] Sin credenciales hardcodeadas
- [ ] Sin datos sensibles en mensajes de error al cliente
- [ ] Ownership verificado server-side, nunca confiar en input del cliente
- [ ] IDs y tokens generados criptográficamente

### Funciones y diseño
- [ ] Cada función hace una sola cosa
- [ ] Early returns en lugar de anidación profunda
- [ ] Nombres semánticos (no `data`, `result`, `temp`)
- [ ] Más de 3 parámetros → objeto con nombres

### Error handling
- [ ] Sin catch vacíos
- [ ] Errores semánticamente correctos
- [ ] Detalles internos logueados, no expuestos al cliente

---

*Skill universal — compatible con cualquier stack o proyecto*
*Para convenciones específicas del stack actual, consultar la skill de contexto del proyecto*
