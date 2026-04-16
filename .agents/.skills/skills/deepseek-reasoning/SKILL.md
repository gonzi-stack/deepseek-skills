---
name: deepseek-reasoning
description: >
  Protocolo de razonamiento profundo obligatorio para DeepSeek R1.
  Activar SIEMPRE antes de cualquier tarea de código: creación de archivos,
  modificación de archivos existentes, corrección de errores, refactoring,
  o cualquier tarea que toque el filesystem del proyecto. Compatible con
  cualquier stack o proyecto — se adapta leyendo el proyecto antes de actuar.
---

# DeepSeek Reasoning Protocol — Universal

> **Este documento es ejecutable, no decorativo.**
> Cada sección es un checkpoint que debes completar mentalmente antes de avanzar.
> No puedes saltar checkpoints. No puedes escribir código antes de completar Phase 0, 1 y 2.

---

## PHASE 0 — Task Intake (antes de leer cualquier archivo)

### 0.1 ¿Qué me están pidiendo exactamente?

Escribe en una oración la tarea concreta. Si no podés escribirla en una oración, la tarea es ambigua — pedí aclaración antes de continuar.

- Correcto: *"Crear `src/services/payments.ts` con una función `processRefund`."*
- Incorrecto: *"Mejorar el sistema de pagos."* → demasiado vago, pedir aclaración.

### 0.2 ¿Cuál es el output explícito esperado?

Lista los archivos que te pidieron crear o modificar. Estos son los únicos archivos que podés tocar.

Si la tarea no especifica archivos, dedúcelos de forma conservadora y confírmalos antes de actuar.

### 0.3 ¿Qué NO te pidieron pero te podría tentar tocar?

Identificá los archivos relacionados que podrían *parecer* que necesitan modificación. Escribilos bajo **"FUERA DE SCOPE — NO TOCAR"**. Esta lista es un contrato.

Si durante la ejecución querés tocar uno de esos archivos, detente y reportá por qué en lugar de hacerlo.

> **Regla de oro del scope:** Si la tarea dice "crear X", solo creás X. Si notás que Y necesita cambios para que X funcione, **no modificás Y**. Reportás: *"Para que X funcione, Y necesita [descripción]. ¿Procedo?"*

---

## PHASE 1 — System Mapping (leer antes de planear)

### 1.1 Leer el proyecto antes de asumir nada

Antes de escribir una sola línea, entendé el proyecto:

1. **Leer el README** o documentación principal si existe.
2. **Explorar la estructura de directorios** — al menos 2 niveles de profundidad.
3. **Identificar el stack** — lenguaje, framework, librerías principales, herramientas de build.
4. **Identificar los archivos de configuración críticos** — `package.json`, `tsconfig.json`, `pyproject.toml`, `Makefile`, `.env.example`, etc.

> **Principio fundamental:** Nunca asumir el stack, las convenciones, o la estructura. Leerlos. Lo que asumís sin leer es deuda técnica potencial.

### 1.2 Identificar los sistemas y archivos críticos del proyecto

Para cualquier proyecto, hay archivos cuyo blast radius es CRÍTICO — si los rompés, rompés todo. Identificalos antes de actuar:

| Categoría | Ejemplos típicos | Señal de que es crítico |
|---|---|---|
| Entry points | `main.ts`, `app.py`, `index.js`, `server.ts` | Todo depende de él |
| Configuración de infraestructura | cliente de DB, cliente HTTP, auth config | Singleton — si lo rompés, nada funciona |
| Router/dispatcher principal | `router.ts`, `urls.py`, `routes.rb` | Registra todos los endpoints |
| Schema/modelos | `schema.sql`, `models.py`, `prisma/schema.prisma` | Fuente de verdad de datos |
| Variables de entorno | `env.js`, `config.py`, `.env` | Si falta una variable, el app no arranca |

Construí esta tabla mental para el proyecto actual antes de continuar.

### 1.3 Leer los archivos existentes antes de escribir

- **Si vas a crear un archivo nuevo en un patrón existente** (ej: un nuevo endpoint, un nuevo módulo): leé al menos UN archivo existente del mismo tipo. Así no inventás interfaces o convenciones que no existen.
- **Si vas a modificar un archivo existente**: leé el archivo completo antes de modificarlo. No asumas su contenido por el nombre.
- **Si tu código importa de un archivo**: leé ese archivo para verificar que el export que necesitás existe con el nombre y firma exactos.

> **Error documentado:** Asumir la firma de un export sin leerlo causó incompatibilidad de tipos que rompió toda la aplicación. Siempre leer la firma real antes de usarla.

### 1.4 Verificar el schema de datos

Si tu tarea escribe queries o accede a modelos de datos:

1. Leer el schema o modelos existentes para verificar nombres exactos de tablas/colecciones/campos.
2. Verificar tipos (nullable vs NOT NULL, tipos de datos).
3. Nunca asumir nombres de campos. El schema es la fuente de verdad.

### 1.5 Verificar variables de entorno

Si tu código usa variables de entorno:

1. Verificar que existen en el archivo de configuración de env del proyecto.
2. Verificar su tipo y formato esperado.
3. Si no existen, agregarlas en todos los lugares necesarios (`.env`, `.env.example`, validación) antes de usarlas en el código.

---

## PHASE 2 — Dependency Blast Radius

Antes de ejecutar, calculá el **blast radius** de tus cambios.

### 2.1 Para cada archivo que vas a CREAR:

```
Archivo: [path]
¿Qué archivos lo importarán?: [lista]
¿Qué archivos importa?: [lista]
¿Si fallo aquí, qué se rompe?: [descripción]
Blast radius: BAJO / MEDIO / CRÍTICO
```

### 2.2 Para cada archivo que vas a MODIFICAR:

```
Archivo: [path]
¿Quién depende de este archivo?: [lista]
¿Si introduzco un error aquí, qué se rompe?: [descripción]
Blast radius: BAJO / MEDIO / CRÍTICO
```

### 2.3 Regla del blast radius CRÍTICO

Si el blast radius es CRÍTICO:
- Hacé el cambio mínimo necesario. No "mejores" nada que no te pidieron.
- Describí exactamente qué líneas vas a cambiar y por qué, antes de escribir cualquier código.
- Después del cambio, verificá que todas las importaciones del archivo modificado siguen siendo válidas.

---

## PHASE 3 — Plan de Ejecución

Solo después de completar las fases anteriores, escribís el plan.

### 3.1 Formato del plan

```
PLAN DE EJECUCIÓN
=================
Tarea: [descripción en una oración]

Archivos a CREAR:
1. [path]
   - Propósito: [qué hace]
   - Importa de: [lista]
   - Exporta: [lista]
   - Dependencias verificadas: [sí/no + cómo]

Archivos a MODIFICAR:
1. [path]
   - Cambio: [descripción exacta]
   - Blast radius: [nivel]
   - Líneas afectadas: [descripción]

Archivos FUERA DE SCOPE (no tocar):
- [lista]

Supuestos que estoy haciendo:
- [lista — si son verificables, verificalos antes de proceder]
```

### 3.2 Regla de los supuestos

Cualquier suposición sobre el código existente es un riesgo.

**Suposiciones prohibidas** (siempre verificar):
- Nombres de exports de un módulo
- Firmas de funciones
- Nombres de campos en la DB o schema
- Variables de entorno disponibles
- Compatibilidad de tipos entre módulos

---

## PHASE 4 — Execution Rules

### 4.1 Seguir las convenciones del proyecto, no las tuyas

Antes de escribir, identificá:
- ¿Usa tabs o spaces? ¿Cuántos?
- ¿Comillas simples o dobles?
- ¿Cómo se nombran los archivos? (kebab-case, camelCase, snake_case)
- ¿Cómo se organizan los imports? ¿Hay un orden establecido?
- ¿Hay un linter o formatter? (ESLint, Prettier, Black, etc.)

Seguí lo que ya existe. No introduzcas tu estilo personal.

### 4.2 Prohibiciones absolutas durante ejecución

```
❌ console.log / print / debug statements en código de producción
❌ Credenciales o secretos hardcodeados
❌ Variables de entorno accedidas directamente sin validación
❌ Modificar archivos fuera del scope definido en Phase 0
❌ Relative imports si el proyecto usa aliases
❌ Crear instancias de singletons fuera de sus módulos canónicos
❌ Ignorar errores con try/catch vacíos
❌ Math.random() para IDs, tokens, o cualquier valor de seguridad
```

### 4.3 Fix mínimo — nunca refactorizar mientras implementás

Si durante la tarea ves código que "podría mejorar", no lo tocás. Lo reportás:

*"Durante esta tarea noté que [archivo] tiene [situación]. No lo modifiqué porque estaba fuera de scope. ¿Querés que lo aborde en una tarea separada?"*

---

## PHASE 5 — Post-Execution Verification

### 5.1 Checklist de scope

- [ ] Solo modifiqué los archivos listados en el plan de Phase 3
- [ ] No modifiqué ningún archivo de la lista "FUERA DE SCOPE"
- [ ] Si identifiqué que un archivo fuera de scope necesita cambios, lo reporté en lugar de hacerlo silenciosamente

### 5.2 Checklist de calidad

- [ ] No hay debug statements en ningún archivo que toqué
- [ ] No hay secretos o credenciales hardcodeadas
- [ ] Todas las variables de entorno usadas están validadas en el sistema de configuración del proyecto
- [ ] Los nombres de campos/columnas/propiedades corresponden al schema real
- [ ] Los imports usan las convenciones del proyecto (aliases, paths relativos, etc.)
- [ ] El código sigue el estilo existente del proyecto (indentación, comillas, naming)

### 5.3 Checklist de integración

- [ ] Todos los exports que creé son correctamente importados donde se necesitan
- [ ] Si agregué un módulo nuevo, está registrado en el entry point correspondiente
- [ ] Los tipos son consistentes entre módulos que interactúan

---

## PHASE 6 — Error Recovery Protocol

### 6.1 Cuando hay errores de compilación o tipos

1. Lee el error completo — no asumas qué lo causa.
2. Identifica el archivo y línea exacta.
3. Lee ese archivo para entender el tipo real que se espera.
4. Corrige solo esa línea. No refactorices el archivo entero.

### 6.2 Cuando un import no resuelve

1. Verifica que el archivo importado existe en el path indicado.
2. Verifica que el export tiene el nombre exacto que estás usando.
3. No cambies el path de otros archivos — corregí tu import.

### 6.3 Cuando una tarea parece imposible sin tocar archivos fuera de scope

Detente. Reportá:

*"Para completar esta tarea necesito modificar [archivo fuera de scope] porque [razón concreta]. ¿Confirmo que debo tocarlo?"*

No procedas hasta recibir confirmación explícita.

---

## Checklist rápido — antes de escribir cualquier código

- [ ] Leí el README o documentación principal
- [ ] Exploré la estructura del proyecto
- [ ] Identifiqué los archivos de blast radius CRÍTICO
- [ ] Leí al menos un archivo del mismo tipo que voy a crear/modificar
- [ ] Verifiqué las firmas exactas de los exports que voy a usar
- [ ] Formulé el plan de ejecución completo
- [ ] El plan incluye la lista "FUERA DE SCOPE"

---

*Skill universal — compatible con cualquier stack o proyecto*
*Versión de proyecto específica: ver skill de contexto del proyecto correspondiente*
