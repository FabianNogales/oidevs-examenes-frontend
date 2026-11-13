# EIDA — Design System

Fuente única de verdad del diseño del frontend de EIDA. La comparten los dos
desarrolladores frontend y sus agentes (Claude Code, OpenCode). Si un documento
local o una conversación contradice estos archivos, prevalecen estos archivos.

> Estado: **en preparación**. Hoy existen en `src/assets/styles/tokens.css` los tokens
> base y semánticos, incluidos los de estado, alturas de control y `z-index` (DS1.4, aún
> sin consumidores), y varios componentes compartidos. La capa `ui/` es **planificada** y
> todavía no existe en el código.

## Objetivo

Unificar botones, colores, tipografía, formularios, tablas, diálogos, badges,
layouts y comportamiento responsive en todos los módulos (portal público,
administración, docente y estudiante) sin cambiar la funcionalidad, los roles ni
los contratos de la API.

## Principios

1. **Reutilizar antes de crear.** Consultar [components.md](components.md) antes de escribir un componente o estilo nuevo.
2. **Tokens, no valores sueltos.** Colores, tipografía, espaciado y radios salen de [tokens.md](tokens.md).
3. **Migración gradual y reversible.** Una feature por subetapa; sin cambios funcionales.
4. **Accesible y responsive por defecto.** Ver [rules.md](rules.md) y [validation.md](validation.md).
5. **Mismo stack.** React 19, TypeScript y CSS Modules. Sin librerías de UI nuevas.

## Documentos

| Archivo | Contenido |
|---|---|
| [tokens.md](tokens.md) | Tokens reales (`tokens.css`), incluidos los semánticos de DS1.4, y su estado |
| [components.md](components.md) | Componentes compartidos existentes y componentes planificados en `ui/` |
| [rules.md](rules.md) | Reglas obligatorias de implementación |
| [validation.md](validation.md) | Cómo validar cada cambio (Node, browser, anchos, evidencia) |
| [PROGRESS.md](PROGRESS.md) | Matriz de migración DS1–DS4 por módulo y responsable |
| [AGENT_SETUP.md](AGENT_SETUP.md) | Cómo usar esta documentación con Claude Code y OpenCode |

## Arquitectura

- **Estilos globales** (`src/assets/styles/`, separados en DS1.3 sin cambio visual):
  `global.css` es el único punto de entrada (lo importa `src/main.tsx`) y solo contiene
  `@import`, en este orden, que fija la cascada:

  | Archivo | Contenido |
  |---|---|
  | `tokens.css` | Tokens: `:root`, tema claro y tema oscuro (no activado) |
  | `base.css` | Reset y estilos base (`*`, `html`, `#root`, `:where(...)`, foco, selección, `svg`) |
  | `shell.css` | `.app-shell`, `.backend-status`, `.session-loading` |
  | `auth.css` | Login: `.auth-*`, `.login-form`, `.primary-button`, `.secondary-button` |
  | `snackbar.css` | `.snackbar*` |
  | `responsive.css` | `@keyframes spin` y las media queries globales (gutter, movimiento reducido, 900px y 620px) |

  No cambiar el orden ni añadir reglas en `global.css`: los contratos de
  `src/shared/tests/cssContracts.test.mjs` lo comprueban.
- **Componentes compartidos existentes:** `src/shared/components/*` y
  `src/features/portal-shared/*` (ver [components.md](components.md)).
- **Componentes planificados:** `src/shared/components/ui/*` (ubicación aprobada; la carpeta se creará en DS2).
- **Estilos:** CSS Modules junto a cada componente; nada de estilos globales nuevos salvo tokens y base.

## Etapas

| Etapa | Objetivo | Estado |
|---|---|---|
| DS0 | Auditoría global (inventario, matriz de inconsistencias, plan) | Hecha |
| DS1 | Fundaciones sin cambio visual: separar `global.css`, añadir tokens semánticos, contratos CSS. Incluye la limpieza de perfiles browser (DS1.1–DS1.2, hecha) | En curso |
| DS2 | Primitivas en `ui/` (Button, Field, Badge, Pagination, EmptyState, Dialog, PageHeader) con catálogo de QA | Pendiente |
| DS3 | Migrar dominios de riesgo bajo (portal-*, academic-terms, rooms, subjects, course-offerings, collaborations, eligibilities) | Pendiente |
| DS4 | Migrar dominios de riesgo alto (admin, students, exams, home) y componentes compartidos con muchos literales (Header, DataTable, DataCardGrid) | Pendiente |

El detalle por módulo está en [PROGRESS.md](PROGRESS.md).

## Colaboración entre los dos frontend

- **Ramas:** `test/design-system-global` es la rama de integración y no se trabaja
  directamente en ella. Cada trabajo va en `ds/<etapa>-<iniciales>` creada desde la
  de integración e integrada mediante PR revisada por el otro desarrollador (o, en
  desarrollo individual, con la excepción documentada de [rules.md](rules.md) §9).
- **Propiedad:** cualquier cambio en tokens o en componentes compartidos
  (`src/shared/components/**`, `src/features/portal-shared/**`) requiere revisión cruzada.
  La revisión humana por el otro desarrollador es la opción preferida; si no hay otro
  desarrollador disponible, se aplica la revisión asistida por IA de [rules.md](rules.md) §9,
  que nunca se registra como revisión humana.
- **Reparto:** cada subetapa se asigna en [PROGRESS.md](PROGRESS.md) antes de empezar,
  para no tocar los mismos archivos a la vez.
- **Estado compartido:** el progreso vive en [PROGRESS.md](PROGRESS.md) (versionado).
  Los checkpoints personales de cada agente son locales y no se publican.

## Existente frente a futuro

| | Existente (usable hoy) | Futuro (planificado) |
|---|---|---|
| Tokens | Los marcados ✅ en [tokens.md](tokens.md), incluidos `--status-*`, `--control-height*` y `--z-*` (DS1.4) | Los marcados 🕒 (hoy ninguno); la migración de consumidores a los tokens de DS1.4 se hace en DS2–DS4 |
| Componentes | DataTable, PortalDialog, ConfirmDialog, AdminStatusBadge, PortalAdminCollection, Breadcrumbs… | Button, Field, Badge genérico, Pagination, EmptyState, Dialog, PageHeader en `ui/` |
| Breakpoints | Valores dispersos (21 distintos en el código) | Canónicos aprobados 480/640/768/1024 px (se adoptan al migrar cada módulo) |

No uses un token o componente "propuesto" hasta que su etapa lo cree y quede registrado aquí.
