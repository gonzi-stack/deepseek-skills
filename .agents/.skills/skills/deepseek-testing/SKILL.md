---
name: deepseek-testing
description: >
  Protocolo de escritura de tests para DeepSeek R1.
  Activar SIEMPRE al escribir tests unitarios, de integración, o e2e,
  al decidir qué testear en un módulo nuevo, o al evaluar por qué un test
  existente no da confianza real. Cubre: qué vale la pena testear y qué no,
  estructura de tests de calidad, casos edge obligatorios, mocking correcto,
  y tests que no dan falsa seguridad. Compatible con cualquier framework
  de testing. Complementa deepseek-code-quality y deepseek-architect.
---

# DeepSeek Testing Skill — Universal

> **Un test que no puede fallar no da confianza. Da falsa seguridad.**
> El objetivo de un test no es que pase — es que falle cuando el código está mal.

---

## Principio fundamental

> **Testeá comportamiento, no implementación.**
> Si un test se rompe cuando refactorizás el código sin cambiar su comportamiento,
> ese test está testeando los detalles internos — no la funcionalidad real.

```typescript
// ❌ WRONG — testea implementación
it("calls getUserById once", async () => {
  const spy = vi.spyOn(userRepo, "getUserById");
  await userService.getProfile("123");
  expect(spy).toHaveBeenCalledOnce(); // ¿Y si lo optimizamos para llamarlo 0 veces con cache?
});

// ✅ CORRECT — testea comportamiento
it("returns the user profile for a valid id", async () => {
  const profile = await userService.getProfile("123");
  expect(profile.id).toBe("123");
  expect(profile.name).toBeDefined();
});
```

---

## FASE 1 — Decidir qué testear

### 1.1 Lo que vale la pena testear

```
Alta prioridad — testear siempre:
✅ Lógica de negocio compleja (cálculos, reglas, transformaciones)
✅ Casos edge que pueden romper la aplicación en producción
✅ Manejo de errores — ¿el código falla correctamente?
✅ Contratos públicos de módulos — lo que otros módulos dependen
✅ Flujos críticos de negocio (registro, pago, autenticación)
✅ Funciones puras con múltiples combinaciones de input/output
```

### 1.2 Lo que no vale la pena testear

```
Baja prioridad — generalmente no testear:
❌ Getters y setters triviales sin lógica
❌ Código que solo llama a una librería externa sin transformación
❌ Detalles de implementación que pueden cambiar
❌ UI cosmética (qué color tiene un botón)
❌ Código generado automáticamente
❌ Configuración estática
```

> **Regla de oro:** Si el test no puede fallar con ningún cambio realista al código, no añade valor. Borralo.

### 1.3 La pregunta correcta antes de escribir un test

```
Antes de escribir cada test, responder:
1. ¿Qué comportamiento específico estoy verificando?
2. ¿Cómo podría este comportamiento romperse en el futuro?
3. ¿El test fallaría si introduzco ese bug?

Si no podés responder las tres, replanteá el test.
```

---

## FASE 2 — Estructura de un test de calidad

### 2.1 El patrón AAA — Arrange, Act, Assert

Todo test tiene tres partes claras y separadas:

```typescript
it("returns null when user does not exist", async () => {
  // ARRANGE — preparar el estado inicial
  const nonExistentId = "id-that-does-not-exist";

  // ACT — ejecutar la acción bajo test
  const result = await userService.getById(nonExistentId);

  // ASSERT — verificar el resultado
  expect(result).toBeNull();
});
```

```
❌ WRONG — las tres partes mezcladas:
it("works", async () => {
  expect(await userService.getById(
    await createUser({ email: "test@test.com" }).then(u => u.id)
  )).toBeDefined();
});
```

### 2.2 Un test, una verificación

```typescript
// ❌ WRONG — múltiples comportamientos en un test
it("user service works", async () => {
  const user = await userService.create({ email: "a@a.com" });
  expect(user.id).toBeDefined();
  expect(user.email).toBe("a@a.com");
  const fetched = await userService.getById(user.id);
  expect(fetched).not.toBeNull();
  await userService.delete(user.id);
  const deleted = await userService.getById(user.id);
  expect(deleted).toBeNull();
  // Si algo falla, ¿qué parte del servicio está rota?
});

// ✅ CORRECT — un comportamiento por test
it("assigns an id when creating a user", async () => { ... });
it("returns the user by id after creation", async () => { ... });
it("returns null after the user is deleted", async () => { ... });
```

### 2.3 Nombres de tests que describen el comportamiento

El nombre de un test es su documentación. Debe poder leerse como especificación.

```typescript
// ❌ WRONG — nombres que no dicen nada
it("works", ...);
it("test 1", ...);
it("getUser", ...);
it("handles error", ...);

// ✅ CORRECT — nombres que describen comportamiento
it("returns null when the user does not exist", ...);
it("throws ForbiddenError when user does not own the resource", ...);
it("sends a welcome email after successful registration", ...);
it("does not expose the password hash in the response", ...);
```

**Patrón recomendado:** `"[qué hace] when [condición]"` o `"[qué resultado] given [estado inicial]"`

---

## FASE 3 — Casos edge obligatorios

Para cualquier función que recibe input o accede a datos externos, estos casos son obligatorios:

### 3.1 Inputs de borde

```typescript
// Para cualquier función que recibe datos:

// Caso 1: Input vacío
it("returns empty array when no items exist", ...);

// Caso 2: Input nulo o undefined
it("throws ValidationError when id is null", ...);

// Caso 3: Input en el límite máximo/mínimo
it("throws ValidationError when name exceeds 100 characters", ...);

// Caso 4: Input con caracteres especiales (si aplica)
it("handles email with plus sign correctly", ...);
```

### 3.2 Estados de la DB

```typescript
// Caso: el registro no existe
it("returns null when user id does not exist in DB", ...);

// Caso: el registro fue eliminado (soft delete)
it("returns null for soft-deleted users", ...);

// Caso: múltiples registros cuando se espera uno
it("returns the most recent record when duplicates exist", ...);
```

### 3.3 Errores de dependencias externas

```typescript
// Caso: la DB falla
it("throws InternalError when DB connection fails", ...);

// Caso: el servicio externo no responde
it("throws ServiceUnavailableError when email provider times out", ...);

// Caso: la operación externa parcialmente falla
it("rolls back the transaction when the second insert fails", ...);
```

### 3.4 Casos de seguridad

```typescript
// Caso: usuario sin permiso
it("throws ForbiddenError when user does not own the resource", ...);

// Caso: recurso de otro usuario
it("does not return resources belonging to other users", ...);

// Caso: token expirado
it("throws UnauthorizedError when session token is expired", ...);
```

---

## FASE 4 — Mocking correcto

### 4.1 Cuándo mockear y cuándo no

```
Mockear:
✅ Dependencias externas (DB, APIs, email, storage) en tests unitarios
✅ El reloj (Date.now()) cuando la lógica depende del tiempo
✅ Funciones con side effects que no querés ejecutar en tests

No mockear:
❌ La unidad que estás testeando
❌ Utilidades puras (funciones que solo transforman datos)
❌ En tests de integración — el punto es testear la integración real
```

### 4.2 Mocks que reflejan el comportamiento real

```typescript
// ❌ WRONG — mock que siempre retorna éxito
vi.mock("@/server/repositories/user", () => ({
  getUserById: vi.fn().mockResolvedValue({ id: "1", name: "Test" }),
}));
// Este mock hace que todos los tests pasen sin importar qué

// ✅ CORRECT — mock que modela el contrato real
const mockUserRepo = {
  getUserById: vi.fn(),
};

// Cada test configura el comportamiento relevante
it("returns null when user does not exist", async () => {
  mockUserRepo.getUserById.mockResolvedValueOnce(null); // el caso real
  const result = await userService.getById("non-existent");
  expect(result).toBeNull();
});

it("returns the user when found", async () => {
  mockUserRepo.getUserById.mockResolvedValueOnce({ id: "123", name: "Alice" });
  const result = await userService.getById("123");
  expect(result?.name).toBe("Alice");
});
```

### 4.3 Verificar que el mock fue llamado con los argumentos correctos

```typescript
// ❌ WRONG — verifica que se llamó pero no cómo
expect(mockRepo.save).toHaveBeenCalled();

// ✅ CORRECT — verifica que se llamó con los datos correctos
expect(mockRepo.save).toHaveBeenCalledWith(
  expect.objectContaining({
    email: "alice@example.com",
    role: "viewer",
  })
);
// Si la función se llama con datos incorrectos, el test falla
```

---

## FASE 5 — Tests de integración vs unitarios

### 5.1 La diferencia práctica

| | Test unitario | Test de integración |
|---|---|---|
| **Qué testea** | Una función o clase aislada | Múltiples capas juntas |
| **Dependencias externas** | Mockeadas | Reales (DB de test, servicios locales) |
| **Velocidad** | Rápido (ms) | Más lento (segundos) |
| **Qué encuentra** | Bugs en lógica interna | Bugs en la integración entre capas |
| **Cuándo usar** | Lógica de negocio compleja | Flujos críticos end-to-end |

### 5.2 Cuándo priorizar cada tipo

```
Tests unitarios — priorizar cuando:
- La función tiene lógica compleja (cálculos, reglas de negocio)
- La función tiene muchos casos edge
- La función es pura (mismo input → mismo output)

Tests de integración — priorizar cuando:
- El flujo involucra múltiples capas (endpoint → servicio → DB)
- Las queries SQL son parte de la lógica (ordenamiento, filtros, joins)
- El comportamiento depende de transacciones o constraints de DB
```

### 5.3 Setup de DB para tests de integración

```typescript
// ✅ CORRECT — DB limpia por test o por suite
beforeEach(async () => {
  await db.execute("DELETE FROM orders");
  await db.execute("DELETE FROM users");
});

// o usar transacciones que se revierten automáticamente
beforeEach(async () => {
  await db.beginTransaction();
});
afterEach(async () => {
  await db.rollback();
});
```

```
❌ WRONG — tests de integración que comparten estado
Si el test A crea un usuario y el test B asume que no hay usuarios,
los tests dependen del orden de ejecución — son frágiles e impredecibles.
```

---

## FASE 6 — Tests que no dan falsa seguridad

### 6.1 Señales de un test débil

```
🚩 El test nunca falló desde que fue escrito
🚩 El test pasa incluso si comentás la función que testea
🚩 El assert es siempre expect(something).toBeDefined() — nunca verifica el valor real
🚩 El test mockea tanto que no queda nada real que ejecutar
🚩 El nombre del test es genérico ("works", "test 1", "should work")
```

### 6.2 Verificar que el test puede fallar

Antes de dar por bueno un test, introducí el bug que debería detectar:

```typescript
// Test:
it("throws ForbiddenError when user does not own the resource", async () => {
  await expect(
    resourceService.delete("resource-123", "wrong-user-id")
  ).rejects.toThrow(ForbiddenError);
});

// Verificación: comentar temporalmente el check de ownership en el servicio
// Si el test sigue pasando → el test no detecta el bug → reescribir el test
// Si el test falla → el test es válido ✓
```

### 6.3 El assert debe ser específico

```typescript
// ❌ WRONG — asserts que siempre pasan
expect(result).toBeDefined();
expect(result).not.toBeNull();
expect(typeof result).toBe("object");

// ✅ CORRECT — asserts que verifican el valor real
expect(result.id).toBe("expected-id");
expect(result.status).toBe("active");
expect(result.items).toHaveLength(3);
expect(result.total).toBe(1500); // centavos
```

---

## Checklist de testing — antes de dar por buenos los tests

### Diseño
- [ ] Cada test verifica un solo comportamiento
- [ ] El nombre del test describe el comportamiento, no la implementación
- [ ] Las tres partes AAA son claras y separadas
- [ ] El test puede fallar si se introduce el bug que debería detectar

### Cobertura de casos
- [ ] Hay tests para el caso feliz (input válido, resultado esperado)
- [ ] Hay tests para los casos de error (recurso no encontrado, sin permiso, input inválido)
- [ ] Hay tests para los casos edge relevantes (null, vacío, límites)
- [ ] Los flujos críticos de negocio tienen tests de integración

### Mocking
- [ ] Los mocks modelan el contrato real de la dependencia (incluyendo casos null/error)
- [ ] Los asserts verifican los argumentos con los que se llamó al mock (cuando es relevante)
- [ ] Los tests de integración usan dependencias reales

### Calidad
- [ ] Los asserts son específicos (no solo toBeDefined o not.toBeNull)
- [ ] El test no pasa si se comenta la lógica que testea
- [ ] El estado de la DB/mundo se resetea entre tests de integración

---

*Skill universal — compatible con cualquier framework de testing*
*Para configuración específica del framework actual, consultar la skill de contexto del proyecto*
