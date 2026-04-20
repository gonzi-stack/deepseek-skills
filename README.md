<div align="center">

# 🧠 DeepSeek Skills

**8 skills de ingeniería senior + 2 skills de diseño UX/UI para DeepSeek R1**

Protocolo de activación selectiva que maximiza el rendimiento del modelo sin saturar su ventana de contexto.

[![npm version](https://img.shields.io/npm/v/deepseek-skills.svg)](https://www.npmjs.com/package/deepseek-skills)
[![GitHub](https://img.shields.io/github/stars/gonzi-stack/deepseek-skills?style=social)](https://github.com/gonzi-stack/deepseek-skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>

---

## ¿Qué es esto?

Un set de **10 skills profundas y detalladas** que transforman a DeepSeek R1 en un agente de ingeniería senior con capacidades de diseño UX/UI. Cada skill es un protocolo estructurado por fases, con checklists, ejemplos reales, y anti-patrones documentados.

El problema: las skills son extensas (~10-28 KB cada una) y el contexto de R1 es limitado.

La solución: un **AGENTS.md** con un **Protocolo de Activación Selectiva (PAS)** que le indica al modelo cómo clasificar cada tarea y cargar **solo las 2-3 skills relevantes**, aprovechando su potencia completa sin desperdiciar tokens.

---

## 🆕 Nuevo: Skills de Diseño UX/UI

> **El agente ahora puede diseñar interfaces al mismo nivel que escribe código.**

Además de las 8 skills de ingeniería, ahora se incluyen **2 skills especializadas en diseño** que se instalan de forma opcional durante el setup:

| ID | Skill | Qué hace |
|---|---|---|
| `CLR` | **deepseek-color** | Razonamiento cromático basado en el contexto del producto. No elige colores porque "se ven bien" — los **deriva** del sector, audiencia, y emociones que el producto necesita comunicar. Cubre psicología del color, sistemas de color con roles semánticos, integración con Tailwind/shadcn, y validación de contraste WCAG. |
| `DSN` | **deepseek-design** | Protocolo de diseño UI/UX perfeccionista y mobile-first. Garantiza que cada componente funcione en 375px antes de escalar a desktop. Cubre uso correcto de shadcn/ui, tokens semánticos, responsive obligatorio, accesibilidad, micro-interacciones, estados vacíos, skeletons, y un checklist de calidad final que no deja nada al azar. |

Estas skills solo se activan en tareas que involucran frontend o interfaces — no se cargan para tareas de backend, infraestructura, o lógica de negocio.

---

## Instalación

```bash
npx deepseek-skills
```

Eso es todo. El CLI interactivo te guía paso a paso:

1. Se copian `AGENTS.md` y `.agents/.skills/skills/` a tu proyecto
2. Te pregunta si tu proyecto necesita las **skills de diseño UX/UI**
3. Si decís que sí, se incluyen `deepseek-color` y `deepseek-design`
4. Si decís que no, se instalan solo las 8 skills de ingeniería

| Archivo | Descripción |
|---|---|
| `AGENTS.md` | Directiva principal del agente — protocolo de activación selectiva |
| `.agents/.skills/skills/` | Las skills seleccionadas (8 core + 2 diseño opcionales) |

### Opciones

```bash
npx deepseek-skills            # Instalar en el directorio actual
npx deepseek-skills --force    # Sobrescribir si ya existen
npx deepseek-skills add        # Añadir skills sin borrar las existentes
npx deepseek-skills list       # Listar las skills con tamaños
npx deepseek-skills --help     # Ver ayuda
```

> **Alternativa (desde GitHub directo):**
> ```bash
> npx github:gonzi-stack/deepseek-skills
> ```

---

## Skills incluidas

### Skills de ingeniería (core)

| ID | Skill | Dominio | Cuándo se activa |
|---|---|---|---|
| `RSN` | **deepseek-reasoning** | Razonamiento | **Siempre** — obligatoria en toda tarea |
| `CQL` | **deepseek-code-quality** | Calidad de código | Al escribir o modificar código |
| `ARC` | **deepseek-architect** | Arquitectura | Creación compleja o refactoring |
| `CTX` | **deepseek-context** | Contexto de proyecto | Para entender stack y convenciones |
| `DBG` | **deepseek-debug** | Debugging | Al corregir errores o bugs |
| `PRF` | **deepseek-performance** | Performance | Al optimizar o investigar lentitud |
| `REV` | **deepseek-review** | Code review | Al revisar código propio o ajeno |
| `TST` | **deepseek-testing** | Testing | Al escribir o diseñar tests |

### Skills de diseño UX/UI (opcionales)

| ID | Skill | Dominio | Cuándo se activa |
|---|---|---|---|
| `CLR` | **deepseek-color** | Razonamiento cromático | Al definir paletas de color para una interfaz o marca |
| `DSN` | **deepseek-design** | UI/UX perfeccionista | Al crear o modificar componentes visuales, páginas o layouts |

---

## Cómo funciona

### El problema

DeepSeek R1 tiene un contexto limitado. Cargar las 10 skills (~150 KB total) consume una parte significativa de la ventana disponible, dejando poco espacio para el código del proyecto.

### La solución: Activación Selectiva

El `AGENTS.md` define 9 categorías de tareas. Cada categoría activa **solo las skills que necesita**:

```
BUILD   → RSN + CQL + (ARC si es multi-capa)
FIX     → RSN + DBG + (CQL si el fix es significativo)
EVOLVE  → RSN + CQL + ARC
PERF    → RSN + PRF + (DBG si parece un bug)
REVIEW  → RSN + REV
TEST    → RSN + TST + (CQL para validar)
CONTEXT → RSN + CTX
PLAN    → RSN + ARC
DESIGN  → RSN + CQL + DSN + (CLR si hay decisiones de color)
```

El modelo clasifica la tarea en thinking mode, declara qué skills activa, las lee completas, y las ejecuta a fondo. **Máxima potencia, mínimo desperdicio.**

### Flujo del agente

```
Tarea del usuario
       │
       ▼
┌─────────────────┐
│  Clasificar     │  ← ¿BUILD? ¿FIX? ¿DESIGN? ...
│  la tarea       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Activar skills │  ← Solo 2-3 de las 10
│  necesarias     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Leer skills    │  ← Completas, sin omitir
│  activadas      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Ejecutar       │  ← Siguiendo los protocolos
│  la tarea       │     de cada skill activa
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Verificar      │  ← Checklists de cada skill
│  y reportar     │
└─────────────────┘
```

---

## Configuración

### Paso 1 — Instalar

```bash
npx deepseek-skills
```

### Paso 2 — Configurar DeepSeek R1

Agregá el contenido de `AGENTS.md` como **instrucción del sistema** o **custom instructions** de DeepSeek R1. El modelo leerá `AGENTS.md` al inicio de cada conversación y seguirá el protocolo automáticamente.

### Paso 3 — (Opcional) Contexto de proyecto

Para mejores resultados, creá un `DEEPSEEK_CONTEXT.md` en la raíz de tu proyecto usando la plantilla de la skill `CTX`. Este archivo le dice al modelo las convenciones específicas de tu proyecto: stack, naming, patrones prohibidos, etc.

### Paso 4 — Gitignore

Decidí si querés versionar las skills:

```gitignore
# Opción A: Ignorar (cada dev instala con npx)
.agents/

# Opción B: Versionar (compartir con el equipo)
# No agregar .agents/ al .gitignore
```

---

## Estructura del AGENTS.md

| Sección | Contenido |
|---|---|
| **§0** | Identidad del agente y directivas base |
| **§1** | Mapa de las 10 skills (8 core + 2 diseño) |
| **§2** | Taxonomía: IDs, dominios, dependencias entre skills |
| **§3** | **Protocolo de Activación Selectiva (PAS)** — el core |
| **§4** | Resumen de las fases de razonamiento obligatorias |
| **§5** | Reglas globales: mínima intervención, prohibiciones |
| **§6** | Flujo de trabajo estándar (diagrama) |
| **§7** | Protocolo multi-tarea |
| **§8** | Integración con contexto de proyecto |
| **§9** | Zona de auto-modificación (editable por el modelo bajo orden del usuario) |

---

## Qué cubre cada skill

### `RSN` — Reasoning (obligatoria)
Protocolo de 6 fases que el modelo ejecuta antes de tocar código: intake → mapping → blast radius → plan → execution → verification. Previene el patrón "adivinar → cambiar → rezar".

### `CQL` — Code Quality
Estándares de tipos seguros, funciones bien diseñadas, queries seguras, seguridad, error handling, y componentes UI. Con ejemplos ✅/❌ para cada regla.

### `ARC` — Architect
Dos fases: (A) diseño arquitectónico para creación compleja — límites del sistema, capas, contratos, puntos de falla; (B) evolución segura de código existente — refactoring, optimización, extensión sin romper.

### `CTX` — Context
Plantilla para documentar el proyecto: stack, estructura, convenciones, patrones prohibidos/requeridos, decisiones ya tomadas. Convierte las skills universales en skills específicas para tu proyecto.

### `DBG` — Debug
Protocolo de diagnóstico: leer error completo → clasificar tipo → trazar origen → hipótesis verificable → fix mínimo. Incluye patrones para cada tipo de error (null, tipos, DB, imports, auth).

### `PRF` — Performance
Medir → identificar bottleneck real → optimizar → medir de nuevo. Cubre N+1 queries, optimización de queries, caching, memory leaks, concurrencia, y documentación de optimizaciones.

### `REV` — Review
Revisión por capas: corrección → seguridad → contratos → mantenibilidad → consistencia → performance. Clasificación de observaciones en 4 niveles (bloqueante/importante/sugerencia/nitpick).

### `TST` — Testing
Qué testear y qué no, patrón AAA, casos edge obligatorios, mocking correcto, tests unitarios vs integración, y detección de tests que dan falsa seguridad.

### `CLR` — Color 🆕
Razonamiento cromático derivado del contexto del producto. Cubre las 5 preguntas de contexto, psicología del color por sector (EdTech, Salud, Fintech, SaaS, E-commerce, Gaming), construcción de sistemas de color con roles semánticos (brand, neutral, success, warning, error), regla 60-30-10, dark mode correcto, integración con Tailwind y shadcn, y validación de contraste WCAG AA/AAA.

### `DSN` — Design 🆕
Protocolo de diseño UI/UX completo con enfoque mobile-first obligatorio. Define jerarquía visual antes de implementar, uso correcto de cada componente de shadcn/ui (con tablas de referencia), patrones de layout responsive (dashboard, grids, stack/row), todos los estados de UX (loading, empty, error, hover, focus, disabled), micro-interacciones con propósito, accesibilidad no opcional (touch targets 44px+, ARIA, focus ring), y un checklist de calidad de 30+ puntos.

---

## FAQ

### ¿Funciona con otros modelos además de DeepSeek R1?

Las skills están optimizadas para el modo thinking de DeepSeek R1, pero los principios son universales. Podés adaptar el `AGENTS.md` para otros modelos con capacidad agentic.

### ¿Puedo agregar mis propias skills?

Sí. Creá un nuevo `SKILL.md` en `.agents/.skills/skills/tu-skill/` y registrala en la tabla de §2 del `AGENTS.md`. El modelo puede hacerlo por vos si se lo ordenas (§9.3).

### ¿Las skills son para un stack específico?

No. Son universales. Los ejemplos usan TypeScript pero los principios aplican a cualquier lenguaje y framework. Las skills de diseño (`CLR`, `DSN`) incluyen integración con Tailwind CSS y shadcn/ui pero el razonamiento aplica a cualquier stack de frontend. Para convenciones específicas de tu stack, usá `DEEPSEEK_CONTEXT.md`.

### ¿Puedo modificar las skills?

Son tuyas. Modificalas libremente. Si encontrás mejoras, abrí un PR.

### ¿Las skills de diseño son obligatorias?

No. Durante la instalación, el CLI te pregunta si tu proyecto necesita skills de diseño UX/UI. Si tu proyecto es puramente backend o infraestructura, simplemente respondé "No" y se instalan solo las 8 skills de ingeniería.

---

## Contribuir

1. Forkeá el repo
2. Creá una rama: `git checkout -b mi-mejora`
3. Hacé tus cambios en las skills o el CLI
4. Abrí un Pull Request

Las skills deben seguir el formato existente: frontmatter → principio fundamental → fases numeradas → checklist final.

---

## Licencia

[MIT](LICENSE)
