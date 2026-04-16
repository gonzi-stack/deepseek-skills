---
name: deepseek-context
description: >
  Plantilla de contexto de proyecto para DeepSeek R1.
  Activar SIEMPRE al comenzar a trabajar en un proyecto nuevo, al retomar
  un proyecto después de un tiempo, o cuando DeepSeek hace suposiciones
  incorrectas sobre el stack, convenciones, o estructura del proyecto.
  Esta skill es una plantilla — debe completarse con los datos reales del
  proyecto antes de usarse. Un archivo por proyecto. Complementa y precisa
  a todas las demás skills.
---

# DeepSeek Project Context Skill — Plantilla Universal

> **Las skills universales te enseñan principios. Esta skill te enseña el proyecto.**
> Sin contexto de proyecto, DeepSeek aplica principios correctos a suposiciones incorrectas.

---

## Instrucciones de uso

Esta skill es una **plantilla**. No está lista para usar tal cual.

**Cómo usarla:**
1. Copiar este archivo al proyecto como `DEEPSEEK_CONTEXT.md` (o similar)
2. Completar cada sección con los datos reales del proyecto
3. Eliminar las secciones que no aplican
4. Agregar secciones que falten y sean relevantes para este proyecto específico
5. Mantenerlo actualizado cuando el stack o las convenciones cambien

**Cuándo activar:**
- Al comenzar cualquier sesión de trabajo en el proyecto
- Cuando DeepSeek asume algo incorrecto sobre el stack o las convenciones
- Cuando se incorpora una tecnología nueva al proyecto

---

## SECCIÓN 1 — Identidad del Proyecto

```
PROYECTO
========
Nombre: [nombre del proyecto]
Descripción: [qué hace en 2-3 oraciones]
Estado: [en desarrollo activo / mantenimiento / legacy]
Equipo: [tamaño del equipo, si es relevante]
```

---

## SECCIÓN 2 — Stack Tecnológico

### 2.1 Lenguaje principal

```
Lenguaje: [TypeScript / Python / Go / etc.]
Versión: [ej: TypeScript 5.3, Python 3.12]
Modo estricto: [sí/no — si TypeScript: strict: true/false]
```

### 2.2 Framework y runtime

```
Framework principal: [Next.js 14 / FastAPI / Express / etc.]
Runtime: [Node.js 20 / Bun / Deno / etc.]
Renderizado: [SSR / CSR / SSG / edge / etc.] (si aplica)
```

### 2.3 Base de datos

```
DB principal: [PostgreSQL / MySQL / MongoDB / etc.]
ORM / Query builder: [Prisma / Drizzle / SQLAlchemy / raw SQL / etc.]
Schema location: [prisma/schema.prisma / src/db/schema.ts / etc.]
Migraciones: [cómo se crean y aplican]
Naming convention en DB: [snake_case / camelCase]
Soft delete: [sí/no — campo: deleted_at / is_deleted / etc.]
```

### 2.4 Autenticación

```
Sistema de auth: [NextAuth / Clerk / Auth0 / custom / etc.]
Sesión: [JWT / cookies / server sessions]
Dónde está el userId en el contexto: [ctx.session.user.id / req.user.id / etc.]
```

### 2.5 Infraestructura y servicios externos

```
Hosting: [Vercel / Railway / AWS / etc.]
Storage: [S3 / Cloudinary / local / etc.]
Email: [Resend / SendGrid / Nodemailer / etc.]
Cache: [Redis / Upstash / en memoria / no hay]
Queue/Jobs: [BullMQ / Inngest / cron / no hay]
Monitoreo: [Sentry / Datadog / logs propios / no hay]
```

### 2.6 Testing

```
Framework de tests: [Vitest / Jest / pytest / no hay]
Tipos de tests existentes: [unitarios / integración / e2e / no hay]
Cómo correr tests: [npm test / pytest / etc.]
Coverage mínimo requerido: [si aplica]
```

---

## SECCIÓN 3 — Estructura del Proyecto

### 3.1 Árbol de directorios comentado

```
[completar con la estructura real del proyecto]

Ejemplo:
src/
├── app/                  # Next.js App Router — pages y layouts
│   └── api/              # API routes (endpoints HTTP)
├── server/               # Lógica server-side
│   ├── services/         # Lógica de negocio
│   ├── repositories/     # Acceso a datos
│   └── context.ts        # Contexto de request (auth, db)
├── components/           # Componentes React reutilizables
├── lib/                  # Utilidades compartidas
│   ├── db.ts             # Cliente de DB (singleton)
│   └── env.ts            # Variables de entorno validadas
└── types/                # Tipos TypeScript globales
```

### 3.2 Archivos de blast radius CRÍTICO

```
Archivos que si se rompen, rompen todo:
- [path]: [por qué es crítico]
- [path]: [por qué es crítico]

Ejemplos comunes:
- src/lib/db.ts: singleton del cliente de DB — todo lo que toca DB depende de este
- src/server/context.ts: contexto de cada request — auth y DB disponibles aquí
- src/lib/env.ts: validación de variables de entorno — el app no arranca si falla
- prisma/schema.prisma: fuente de verdad del schema — migraciones dependen de este
```

---

## SECCIÓN 4 — Convenciones del Proyecto

### 4.1 Naming

```
Archivos:           [kebab-case / camelCase / snake_case]
Componentes React:  [PascalCase — ej: UserCard.tsx]
Funciones:          [camelCase — ej: getUserById]
Clases:             [PascalCase — ej: UserService]
Variables:          [camelCase]
Constantes:         [UPPER_SNAKE_CASE / camelCase]
Tablas en DB:       [snake_case / camelCase — ej: user_sessions]
Columnas en DB:     [snake_case / camelCase — ej: created_at]
```

### 4.2 Estructura de un endpoint/handler

```
[Describir el patrón que sigue el proyecto para definir endpoints]

Ejemplo Next.js + tRPC:
export const userRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return userService.getById(input.id, ctx.session.userId);
    }),
});

Ejemplo Express:
router.get("/users/:id", authenticate, async (req, res) => {
  const user = await userService.getById(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});
```

### 4.3 Estructura de un servicio

```
[Describir cómo están organizados los servicios en este proyecto]

Ejemplo:
// src/server/services/user.service.ts
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async getById(id: string): Promise<User | null> {
    return this.userRepo.findById(id);
  }
}
```

### 4.4 Error handling

```
Sistema de errores del proyecto: [clases custom / códigos HTTP directos / Result types / etc.]

Errores definidos en: [src/lib/errors.ts / etc.]

Errores disponibles:
- NotFoundError: [cómo se lanza]
- ForbiddenError: [cómo se lanza]
- ValidationError: [cómo se lanza]
- InternalError: [cómo se lanza]

Ejemplo de uso:
throw new NotFoundError(`User ${id} not found`);
```

### 4.5 Validación de inputs

```
Librería de validación: [Zod / Yup / Joi / class-validator / etc.]
Dónde se definen los schemas: [junto al endpoint / en carpeta schemas/ / etc.]

Ejemplo:
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});
```

### 4.6 Variables de entorno

```
Archivo de validación: [src/lib/env.ts / config.py / etc.]
Cómo acceder a variables: [env.DATABASE_URL / process.env.DATABASE_URL / settings.db_url]
Variables requeridas: [lista de las más importantes]

Ejemplo:
// Correcto en este proyecto:
import { env } from "@/lib/env";
const db = new Database(env.DATABASE_URL);

// Incorrecto:
const db = new Database(process.env.DATABASE_URL); // no validado
```

### 4.7 Imports y aliases

```
Alias configurados:
- "@/" → src/
- "~/" → [otro path si aplica]
- [otros aliases]

Orden de imports:
1. Librerías externas
2. Imports internos con alias (@/)
3. Imports relativos

Ejemplo correcto:
import { z } from "zod";
import { userService } from "@/server/services/user.service";
import { formatDate } from "./utils";
```

---

## SECCIÓN 5 — Reglas del Proyecto

### 5.1 Patrones prohibidos en este proyecto

```
[Lista de cosas que NO se hacen en este proyecto específico]

Ejemplos:
- No usar fetch() directo en componentes — usar el hook useQuery del proyecto
- No hacer queries SQL en endpoints — usar los repositorios
- No crear instancias de PrismaClient fuera de src/lib/db.ts
- No usar console.log — usar el logger de src/lib/logger.ts
- No importar desde node_modules con path relativo
```

### 5.2 Patrones requeridos en este proyecto

```
[Lista de cosas que SÍ se hacen siempre en este proyecto]

Ejemplos:
- Todo endpoint protegido debe usar el middleware authenticate
- Todo acceso a datos debe pasar por un repositorio
- Todo componente de página debe tener su propio archivo de tipos
- Los errores de DB siempre se loguean antes de re-lanzar
```

### 5.3 Decisiones de diseño importantes ya tomadas

```
[Decisiones arquitectónicas que no están a debate — ya se decidieron]

Ejemplos:
- Usamos soft delete en todas las entidades. No usar DELETE físico.
- El estado del cliente se maneja con Zustand, no con Context API.
- Los emails se envían de forma asíncrona desde un job, no síncronamente.
- Todos los IDs son UUIDs generados por la aplicación, no por la DB.
```

---

## SECCIÓN 6 — Comandos del Proyecto

```
Instalar dependencias:  [npm install / pnpm install / pip install -r requirements.txt]
Desarrollo local:       [npm run dev / uvicorn main:app --reload]
Build:                  [npm run build]
Tests:                  [npm test / pytest]
Linter:                 [npm run lint / flake8]
Formatter:              [npm run format / black .]
Migraciones (crear):    [npx prisma migrate dev --name / alembic revision]
Migraciones (aplicar):  [npx prisma migrate deploy / alembic upgrade head]
Generar tipos:          [npx prisma generate / etc.]
```

---

## SECCIÓN 7 — Contexto de Negocio Relevante para el Código

```
[Información del dominio que afecta decisiones de código]

Ejemplos:
- Los usuarios pueden tener múltiples workspaces. El workspace actual siempre
  está en ctx.session.currentWorkspaceId.

- Los precios siempre se almacenan en centavos (integer) para evitar
  problemas de punto flotante. Nunca almacenar decimales de dinero.

- Un "proyecto" puede estar en estado: draft, active, archived, deleted.
  Solo los proyectos active son visibles para los usuarios finales.

- Las operaciones de billing son idempotentes por diseño — siempre verificar
  si ya existe antes de crear.
```

---

*Esta skill debe mantenerse actualizada. Un contexto desactualizado es peor que ningún contexto.*
*Versión del stack documentada: [fecha de última actualización]*
