<div align="center">

# 🧠 DeepSeek Skills

**8 skills de ingeniería senior para DeepSeek R1**

Protocolo de activación selectiva que maximiza el rendimiento del modelo sin saturar su ventana de contexto.

[![npm version](https://img.shields.io/npm/v/deepseek-skills.svg)](https://www.npmjs.com/package/deepseek-skills)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>

---

## ¿Qué es esto?

Un set de **8 skills profundas y detalladas** que transforman a DeepSeek R1 en un agente de ingeniería senior. Cada skill es un protocolo estructurado por fases, con checklists, ejemplos reales, y anti-patrones documentados.

El problema: las skills son extensas (~10-16 KB cada una) y el contexto de R1 es limitado.

La solución: un **AGENTS.md** con un **Protocolo de Activación Selectiva (PAS)** que le indica al modelo cómo clasificar cada tarea y cargar **solo las 2-3 skills relevantes**, aprovechando su potencia completa sin desperdiciar tokens.

---

## Instalación

```bash
npx deepseek-skills
```

Eso es todo. Se copian dos cosas a tu proyecto:

| Archivo | Descripción |
|---|---|
| `AGENTS.md` | Directiva principal del agente — protocolo de activación selectiva |
| `.agents/.skills/skills/` | Las 8 skills universales |

### Opciones

```bash
npx deepseek-skills          # Instalar en el directorio actual
npx deepseek-skills --force   # Sobrescribir si ya existen
npx deepseek-skills --help    # Ver ayuda
npx deepseek-skills list      # Listar las skills con tamaños
```

---

## Skills incluidas

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

---

## Cómo funciona

### El problema

DeepSeek R1 tiene un contexto limitado. Cargar las 8 skills (~97 KB total) consume una parte significativa de la ventana disponible, dejando poco espacio para el código del proyecto.

### La solución: Activación Selectiva

El `AGENTS.md` define 8 categorías de tareas. Cada categoría activa **solo las skills que necesita**:

```
BUILD   → RSN + CQL + (ARC si es multi-capa)
FIX     → RSN + DBG + (CQL si el fix es significativo)
EVOLVE  → RSN + CQL + ARC
PERF    → RSN + PRF + (DBG si parece un bug)
REVIEW  → RSN + REV
TEST    → RSN + TST + (CQL para validar)
CONTEXT → RSN + CTX
PLAN    → RSN + ARC
```

El modelo clasifica la tarea en thinking mode, declara qué skills activa, las lee completas, y las ejecuta a fondo. **Máxima potencia, mínimo desperdicio.**

### Flujo del agente

```
Tarea del usuario
       │
       ▼
┌─────────────────┐
│  Clasificar     │  ← ¿BUILD? ¿FIX? ¿EVOLVE? ...
│  la tarea       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Activar skills │  ← Solo 2-3 de las 8
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
| **§1** | Mapa de las 8 skills |
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

---

## FAQ

### ¿Funciona con otros modelos además de DeepSeek R1?

Las skills están optimizadas para el modo thinking de DeepSeek R1, pero los principios son universales. Podés adaptar el `AGENTS.md` para otros modelos con capacidad agentic.

### ¿Puedo agregar mis propias skills?

Sí. Creá un nuevo `SKILL.md` en `.agents/.skills/skills/tu-skill/` y registrala en la tabla de §2 del `AGENTS.md`. El modelo puede hacerlo por vos si se lo ordenas (§9.3).

### ¿Las skills son para un stack específico?

No. Son universales. Los ejemplos usan TypeScript pero los principios aplican a cualquier lenguaje y framework. Para convenciones específicas de tu stack, usá `DEEPSEEK_CONTEXT.md`.

### ¿Puedo modificar las skills?

Son tuyas. Modificalas libremente. Si encontrás mejoras, abrí un PR.

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
