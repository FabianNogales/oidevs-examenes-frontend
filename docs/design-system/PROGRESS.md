# Progreso del Design System

Registro compartido. Cada subetapa se asigna aquí **antes** de empezar y se actualiza
al cerrarla. No marcar nada como hecho sin la validación de [validation.md](validation.md).

Leyenda: ✅ hecho · 🔄 en curso · ⏳ pendiente · — no aplica.
Responsable: `Pendiente` hasta que el equipo lo asigne.

## Etapas transversales

| Etapa | Alcance | Estado | Responsable | Referencia |
|---|---|---|---|---|
| DS0 | Auditoría global | ✅ | Erick | Informe DS0 |
| DS1.1–DS1.2 | Limpieza automática de perfiles Chrome (`browserProfile.mjs`, 14 scripts) | ✅ | Erick | commit `f3cf6f5` |
| SK3 | Documentación compartida (`docs/design-system/`) | ✅ | Erick | PR #4 (`50d45d9`), `dbb8cf9` |
| DS1.3a | Separar `global.css` en `tokens.css`, `base.css`, `shell.css`, `auth.css`, `snackbar.css` y `responsive.css` (bloques contiguos, mismo orden); `global.css` queda solo con `@import` | ✅ | Erick | rama `ds/trabajo-erick`; `dist/` del build idéntico byte a byte (CSS principal SHA-256 `bb0bf29b…`) |
| DS1.3b | Contratos CSS de la separación en `cssContracts.test.mjs` (orden de `@import`, archivos existentes, tokens documentados con sus valores, sin `data-theme` en componentes) y documentación actualizada | ✅ | Erick | rama `ds/trabajo-erick`; `dist/` sigue idéntico a la referencia de DS1.3a |
| DS1.4a | Tokens semánticos de estado (`--status-*`, 10) y de controles (`--control-height`, `--control-height-sm`) en `tokens.css`, sin consumidores; contratos CSS | ✅ | Erick | rama `ds/trabajo-erick`; CSS compilado: solo las 12 declaraciones nuevas; 20 CSS de features idénticos |
| DS1.4b | Escala `--z-*` en `:root` (`--z-sticky` 50, `--z-dropdown` 60, `--z-dialog` 1000, `--z-toast` 1100), sin consumidores; contratos CSS | ✅ | Erick | rama `ds/trabajo-erick`; CSS compilado: solo las 4 declaraciones nuevas. Conflictos de apilamiento (Snackbar, `AddStudentsModal`) pendientes de DS2–DS4 |
| DS2 | Primitivas en `ui/` y catálogo de QA | 🔄 | Pendiente | — |
| DS2.1a | `PageContainer` y `PageHeader` en `src/shared/components/ui/`, sin consumidores; pruebas SSR y de CSS (`ui/tests/pageLayout.test.mjs`) | ✅ | Erick | rama `ds/trabajo-erick`; `dist/` idéntico (sin consumidores) |
| DS2.1b | Importar aulas y materias con `PageContainer`/`PageHeader` (sin tocar `CsvImport.module.css`) | ✅ | Erick | `pageLayout.browser.mjs` PASS a 320/390/768/1440px |
| DS2.1c | Gestión de aulas y materias (`id` y `tabIndex={-1}` del `h1`, migas y acciones conservadas) | ✅ | Erick | `pageLayout.browser.mjs` PASS a 320/390/768/1440px |
| DS2.1d | Carreras (`AdminReadPage` variante `careers`; Auditoría y Estudiantes sin cambios) | ✅ | Erick | `adminBatch.integration` PASS; `pageLayout.browser.mjs` PASS (Carreras y Auditoría) a 320/390/768/1440px |
| DS2.1e | Criterios de habilitación: sin tarjeta exterior ni `<main>` anidado, rejilla `minmax(420px)` (máx. 2 columnas), todas las acciones conservadas; diálogo de estado sin migrar | ✅ | Erick | `hu34.ui.browser` PASS a 320–1440px |
| DS2.1f | Noticias admin (`PortalAdminCollection headerVariant="page"`, opcional; Servicios e Información sin cambios, marcado por defecto idéntico a `e4f5bbd`) y pública (`NewsPage` con `PageContainer narrow`; `NewsDetailPage` y `HomePage` sin cambios) | ✅ | Erick | `pageLayout.browser.mjs` 32/32 y regresión de Noticias, Servicios e Información PASS. Sin revisión humana; revisión técnica asistida por IA (rules.md §9) |
| DS2.1g | Servicios e Información: administración con `headerVariant="page"` (clase local de reinicio de ancho y padding; `portalShared.module.css` sin cambios) y páginas públicas con `<main>` propio, `PageContainer narrow` y `PageHeader` (fondo `#eff6fc` de Servicios conservado; `ServiceDetailPage` sin cambios) | ✅ | Erick | `pageLayout.browser.mjs` 48/48, regresión de Noticias, Servicios e Información PASS. Pruebas ajustadas a la estructura nueva: `services.integration` F2.1 y selector de la introducción en `hu42-hu43.ui`. Sin revisión humana; revisión técnica asistida por IA (rules.md §9) |
| DS2.2a | `Button` y `ButtonLink` en `ui/Button/` (4 variantes, 2 tamaños, `loading`); contrato de tokens DS1.4 con lista cerrada (`Button.module.css` usa `--control-height*`) | ✅ | Erick | `button.test` y `button.browser` (AA, foco, 4 anchos) PASS. Sin revisión humana; revisión técnica asistida por IA (rules.md §9) |
| DS2.2b | `Field`, `TextInput`, `Select` y `Textarea` en `ui/Field/` (render-prop con `id`, `required`, `aria-invalid` y `aria-describedby`; controles nativos con `ref`) | ✅ | Erick | `field.test` y `field.browser` PASS. Sin revisión humana; revisión técnica asistida por IA (rules.md §9) |
| DS2.2c | Piloto Aulas: `Button`/`ButtonLink` en cabecera, búsqueda, paginación y diálogos; `TextInput`/`Select` en búsqueda y filtro; `RoomFormField` sobre `Field` (misma API). CSS de Aulas sin cambios (lo importan Materias y Periodos) | ✅ | Erick | `rooms.browser.mjs` 10/10 antes y después (comportamiento idéntico). Excepciones: acciones de fila, cerrar ×, importación CSV. Sin revisión humana; revisión técnica asistida por IA (rules.md §9) |
| DS2.2d | Materias e importación CSV (Aulas y Materias juntas) con `Button`/`Field` | 🔄 | Erick | Botones de Materias y Periodos ✅ `b750e55` (32 `Button` y 1 `ButtonLink`; mismas excepciones que Aulas). Importación CSV compartida ✅ DS4.2a `3bdfcab`. Pendientes: `Field`/controles, acciones de fila y cerrar ×. Sin revisión humana; revisión técnica asistida por IA |

## Matriz por módulo (DS3–DS4)

"Alineado F1–F2" significa que ya comparte contenedor, textos y badges del portal; **no** que esté migrado a `ui/`.

| Módulo | Riesgo | Etapa | Estado | Responsable | Notas DS0 |
|---|---|---|---|---|---|
| portal-news | Bajo | DS3 | ⏳ (alineado F1–F2) | Pendiente | |
| portal-information | Bajo | DS3 | ⏳ (alineado F1–F2) | Pendiente | |
| portal-services | Bajo | DS3 | ⏳ (alineado F1–F2) | Pendiente | |
| portal-calendar | Bajo | DS3 | ⏳ (alineado F1–F2) | Pendiente | |
| portal-shared | Bajo | DS3 | ⏳ | Pendiente | Base de `ui/` (AdminStatusBadge, PortalUi) |
| academic-terms | Bajo | DS3 | 🔄 (cabecera ✅ DS3.1 `c6864f5`; botones ✅ DS2.2d `b750e55`) | Erick | Pendientes: acciones de fila, cerrar ×, campos (`Field`), tabla y paginación propias |
| rooms | Bajo | DS3 | ⏳ | Pendiente | 3 modales, 2 tablas |
| subjects | Bajo | DS3 | 🔄 (botones ✅ DS2.2d `b750e55`) | Erick | 3 modales, 2 tablas. Pendientes: acciones de fila, cerrar ×, campos (`Field`) e importación CSV |
| course-offerings | Bajo | DS3 | ⏳ | Pendiente | 3 paginaciones propias |
| collaborations | Bajo | DS3 | 🔄 (U3.2 páginas ✅ `7dc7d53`; modal en top layer ✅ DS4.2c.2) | Erick | 4 modales |
| eligibilities / eligibility-automation | Medio | DS3 | 🔄 (U3.3 páginas ✅ `f90c9c0`) | Erick | 4 tablas |
| admin | Alto | DS4 | ⏳ | Pendiente | 330 colores literales; `EntityProfileLayout` duplicado; 22 clases de botón |
| students | Alto | DS4 | 🔄 (DS4.1a ✅ `54988fb`; DS4.2a ✅ `3bdfcab`; U1 Estudiantes ✅ `04ce3aa`; U2 Mi perfil y Mis exámenes ✅ `a08bdfc`; breadcrumbs estudiante ✅ D2) | Erick | Cabeceras y migas de Mi perfil/Mis exámenes completas; subrayado provisional conservado. Componentes internos y restos DS pendientes de auditoría; no repetir U1/U2 |
| exams | Alto | DS4 | 🔄 (U1 Mis exámenes ✅ `04ce3aa`; U3.1 Detalle ✅ `dd7cdfe`; Programar Evaluación móvil ✅ `f9348a8`, `81671d7`, `ddce9c8`; Control de ingreso ✅ D2) | Erick | Control de ingreso: layout y operación con fixtures PASS; cámara física/lectura óptica pendientes. Programar Evaluación: diseño aprobado, no rediseñar (decisión 9). Subpáginas: U3 |
| home | Medio | DS4 | ⏳ | Pendiente | 59 `font-size` en px |
| shared/components (Header, DataTable, DataCardGrid) | Alto | DS4 | ⏳ | Pendiente | Unos 217 literales; usados por muchas features |
| layouts | Bajo | DS4 | ⏳ | Pendiente | |
| auth, health, infractions, reports, entries, eligibility, collaborators | — | Por auditar | ⏳ | Pendiente | Sin CSS propio significativo en DS0 |
| incidents, infractions, expulsions, exam-reports, attendance | Medio | DS3 | 🔄 (U3.4 páginas ✅ `b34c998`, `cdca260` y U3.4c) | Erick | `Incidents.module.css` compartido sin tocar (control de ingreso y administración). Pendiente: id no válido sin layout en 4 listas |

## Criterios de aceptación

| Etapa | Criterio |
|---|---|
| DS1.3 | CSS compilado idéntico byte a byte; estilos calculados idénticos en las pantallas representativas; batería Node, build y contratos CSS en verde |
| DS1.4 | Tokens nuevos definidos solo a partir de tokens existentes; documentados en [tokens.md](tokens.md); contrato CSS que comprueba que existen |
| DS2 | Pruebas de accesibilidad de cada primitiva (nombre accesible, `aria-*`, foco y Escape); catálogo sin desbordamiento a 320, 390, 768 y 1440px; contraste AA medido |
| DS3 / DS4 (por módulo) | Pruebas de la feature en verde; browser con transporte simulado a los cuatro anchos; cero colores y `font-size` en px literales en los archivos migrados (salvo excepciones justificadas en [rules.md](rules.md)); sin cambios funcionales; revisión del otro desarrollador |

## Decisiones aprobadas

1. Primitivas de UI en `src/shared/components/ui/`.
2. Tema oscuro: se conservan sus tokens y **no se activa**.
3. Breakpoints canónicos: 480, 640, 768 y 1024px.
4. Tokens semánticos de [tokens.md](tokens.md): `--status-*` y `--control-height*` implementados en DS1.4a; escala `--z-*` (`--z-sticky` 50, `--z-dropdown` 60, `--z-dialog` 1000, `--z-toast` 1100) implementada en DS1.4b. `--control-height*` lo consume `Button` (DS2.2a); el resto aún no tiene consumidores y se adopta al migrar cada componente o módulo (DS2–DS4).
5. Erick es responsable de DS0, DS1.1–DS1.2, SK3, DS1.3, DS1.4 y DS2.1a.
6. Estructura de página (DS2.1): `h1` de página `--font-size-3xl` (`--font-size-2xl` ≤640px) en bold; anchos `default` 1280px (`--content-max-width`) y `narrow` 960px. Adoptarlos en una pantalla existente es un cambio visual intencionado que se valida pantalla por pantalla.

7. `Button` (DS2.2a): el hover/active de `danger` mezcla `--color-error` con `--color-text` (`color-mix`); en tema claro oscurece, **revisar antes de activar el tema oscuro**. El estado deshabilitado mantiene `opacity: 1`. `ButtonLink` usa `Link` de `react-router` (el proyecto no tiene `react-router-dom`).
8. `Field` (DS2.2b): el error de campo no es región viva (sin `role="alert"`); se anuncia con el control por `aria-describedby`. Los controles usan los tokens `--input-*` existentes.
9. **Programar Evaluación (`/teacher/subjects/:id/exams/create`): diseño APROBADO (decisión del 2026-11-08, captura local).** No se rediseña en U1, U2, U3 ni en migraciones posteriores. Se conservan distribución (dos columnas por encima de 1080px), tarjetas, calendario, selector de aulas, horarios, colores, tipografía, espaciados y barra inferior. Solo se admiten correcciones puntuales de errores demostrados, sin alterar el diseño ni los contratos funcionales. Guarda automática: `features/exams/tests/examCreateDesignGuard.browser.mjs` (firma idéntica DOM/estilos/geometría frente a un commit base a 320–1440px). Mismo criterio para Editar examen, que comparte `ExamSchedulerPageShell` (guarda con `EIDA_EXAM_GUARD_SCREEN=edit`). El desbordamiento previo a 320px se corrigió en `f9348a8` y las tarjetas de aula en `81671d7`/`ddce9c8` (ajustes autorizados; desbordamiento por debajo de 390px, tarjetas de aula por debajo de 480px).
10. Subrayado rojo bajo el `h1` de las páginas de estudiante: **decisión de diseño pendiente**. No hay referencia de Figma en el repositorio que lo exija o lo descarte; se conserva provisionalmente (U2) como `.page h1::after` en sus módulos.

## Hallazgos visuales reservados para DS2

Registrados en la verificación manual de DS1.4 (no se corrigen en DS1):

- Tamaños de título distintos entre módulos (→ `PageHeader`; 6 pantallas migradas en DS2.1b–e, Noticias pendiente).
- Espaciados y anchos de contenido no uniformes (→ `PageContainer`; mismas pantallas).
- Botones sin estilo común: 64 clases y alturas de 36 a 48px (→ `Button`; primer módulo migrado: Aulas, DS2.2c). Pendiente: variante de peligro suave para acciones de fila.
- Pantalla de criterios de habilitación (`eligibility-automation`): distribución corregida en DS2.1e.

## Estabilización post-merge con Arqmoc (D3)

Rama `ds/sync-arqmoc-erick`, sobre la fusión `524578b` (DS `45a1ec9` + Arqmoc `a12b4a8`). Solo se cambiaron pruebas; ningún archivo de producción.
Sin revisión humana; revisión técnica asistida por IA.

| Fallo heredado | Causa raíz | Clasificación | Corrección |
|---|---|---|---|
| `eligibilities.integration` (11) | `ManageEligibilityModal` importa `AuthenticatedImage` (Arqmoc `ad44491`); la lista cerrada de dependencias de la prueba lo rechazaba | Prueba obsoleta | Simulación de `AuthenticatedImage` en la lista; aserciones intactas |
| `examSchedulingTime` (4 de formulario + 1 de calendario) y `pathReferences` (última referencia rota) | Arqmoc `45a1754` sustituyó `ExamFormFields.tsx` por `ExamScheduler/*` y `useExamSchedulerState` | Prueba obsoleta / ruta rota | Pruebas reescritas sobre el hook en la frontera del módulo: misma carga útil, 422 real, edición que bloquea inicios vencidos. El mínimo del calendario se prueba sobre `examScheduleFormatters` |
| `examCreatePage` (1) | Los estados bloqueados pasaron a `ExamPageStateNotice` | Prueba obsoleta | Se expande el aviso y se comprueba título y texto visibles |
| `offlineAssignments` (1) | `OfflineAssignmentCards` pluraliza («1 estudiante») y delega la selección a la página (`onSelectList`, `7f9c0ec`) | Prueba obsoleta | Singular estricto; se comprueba que se entrega el `list_id` |
| 8 pruebas browser | Importaban `CreateExamModal.module.css`, eliminado en Arqmoc | Ruta rota | Se quitó la importación (sin consumidores en producción) |
| `historicalPhoto.browser` | `EntryQrStudentIdentity` carga también la foto actual con `AuthenticatedImage` (`ad44491`) | Prueba obsoleta | La foto actual del fixture es una ruta privada autenticada: 3 blobs, textos alternativos y petición autenticada comprobados |

Validación: Node 863/864 (0 fallos, 1 `todo`); `tsc` OK; build OK; ESLint 36 = Arqmoc (0 nuevos); `historicalPhoto` 9/9; `hu34.ui` y las 6 pruebas browser recuperadas, sin errores; 14 pruebas browser del DS y del portal PASS.

Bloqueos pendientes:

- **Contrato ambiguo — mínimo del calendario en creación.** `ExamScheduler` deshabilita los días pasados según el reloj del dispositivo también al crear; la regla anterior no lo exigía. Se registra como `todo` en `examSchedulingTime`, que se ejecuta y falla. Requiere una decisión de producto.
- **Contrato ambiguo — 422 al crear.** Se muestra el resumen genérico («Revisa los datos seleccionados…»), no el detalle de `start_time` del backend. La prueba fija el comportamiento actual y lo marca con un comentario.
- **Bloqueado por entorno.** `imageProxy.browser` depende de `env.apiUrl` del `.env` local, que no se lee. `sprint3.integration.browser`, `hu40` y `hu41` usan un backend real: requieren autorización específica.
- Las pruebas browser de Arqmoc sin `browserProfile` escriben su evidencia en `C:\TIS\tmp\hu27–hu30-browser`, fuera del repositorio.

## Pendiente de coordinación

- Responsables de DS4 (admin, students, exams, home y componentes compartidos) y del resto de subetapas marcadas como `Pendiente`.

## D5.1 - Unificación visual real (2026-11-07)

- Responsable: Codex / Erick, rama autorizada ds/sync-arqmoc-erick, base f56e082. Implementación y commits locales autorizados; sin publicación.
- Causa: cabeceras locales (Calendario, Docentes, Asignaciones, Historial y Auditoría), ruta legacy condicional de ReadPage y breadcrumbs omitidos. PageHeader/PageContainer reutilizados; H1 3xl/2xl, peso bold y line-height tight. Carreras ya usaba PageHeader: se agregan sus breadcrumbs. Noticias e Información conservan el contrato compartido.
- Superficies: Docentes tenía #f6f8fb y gutters propios; usa color-background y PageContainer. Servicios usaba servicesPage (#eff6fc); su listado ahora hereda la misma superficie pública que Información. Detalle de servicios intacto. Sin tokens nuevos ni selectores globales.
- PageHeader acepta titleRef opcional para preservar el retorno de foco del Calendario. Acciones, etiquetas, avisos y comportamiento conservados. Inicio enlaza a /; Docentes a /admin/teachers; página actual con aria-current.
- PASS: Node 863/864, 0 fallos y 1 TODO previo; TypeScript y build; ESLint 36 = base, incluido el error previo de Docentes comprobado contra HEAD; diff --check. Las pruebas Node de módulos están incluidas en la batería completa; focalizadas Calendario/Usuarios 93/93.
- PASS: pageLayout.browser 80/80 antes (fuentes f56e082) y después, 16 pantallas a 320/390/768/1024/1440; H1, breadcrumbs, superficie calculada, landmarks, controles y overflow. Chrome real con transporte simulado; no es una sesión autenticada contra backend. Capturas: .validation.local/visual-d5/{before,after}. adminCalendarFocus.browser PASS (incluido foco H1 al salir una fila del filtro).
- Revisión técnica: diff acotado a presentación; titleRef opcional no altera otros consumidores; enlaces contrastados con router; sin cambios API, permisos o negocio. Sin revisión humana; revisión técnica asistida por IA.
- Pendientes: verificación con datos reales/backend y deuda previa de ESLint/TODO de fechas de exámenes, fuera de D5.1.

## D5.2 - Consistencia estructural (2026-11-07)

- Responsable: Codex / Erick; rama autorizada `ds/sync-arqmoc-erick`, base `e53225a`, inicio limpio. Implementación y commits locales autorizados; sin publicación.
- Diagnóstico acotado: tres patrones H1 (PageHeader 32/24px, bold; Usuarios/roles/Importar estudiantes 24px, 600; Importar asignaciones con clamp 1.7–2.25rem heredado de Aulas). Contenedores locales de 1600px, gutters de 50px, breadcrumbs manuales y un main anidado en Importar estudiantes. PageHeader/PageContainer/Breadcrumbs compartidos no requerían otra implementación.
- Migrados: Gestión de usuarios y Roles y permisos (`ManageAccounts`), detalle de roles (consumidor directo), Importar estudiantes e Importar asignaciones. Historial ya cumplía el contrato: comprobado con filas sintéticas. Descripción propia para el catálogo de roles. Eliminadas las cabeceras CSS duplicadas sin consumidores; acciones, datos, estados CSV, query de docente y permisos conservados.
- Contrato computado: H1 32/24px, peso 700, línea 40/30px; breadcrumbs y margen inferior de cabecera 24px, descripción 8px; PageContainer máximo 1280px, padding compartido, un solo main del layout. El ancho efectivo se comprueba contra clientWidth: las páginas altas reservan la barra vertical del navegador. Información, Noticias y Servicios públicos conservan explícitamente narrow=960px y superficie heredada, sin cambios de producción.
- Overflow reproducido con CSV largo: Importar estudiantes alcanzaba scrollWidth=851 a 320px (886 a 390px), dejando «Quitar archivo» inaccesible. Causa: fileState flex sin wrap y nombre con mínimo intrínseco. Se permite wrap, min-width:0 y overflow-wrap:anywhere en el bloque compartido, sin ocultar contenido. No se cambia el scroll local de tablas.
- PASS: `node --test <todos los *.test.mjs de src>` 864/865, 0 fallos y 1 TODO previo; incluye nueva prueba de encabezado/breadcrumbs en los cuatro pasos CSV. `npx.cmd tsc -b` y `npm.cmd run build` PASS. `npm.cmd run lint`: 36 errores = línea base, 0 nuevos; ESLint de los TSX modificados PASS; `git diff --check` PASS.
- PASS Chrome: `pageLayout.browser.mjs` 105/105 (21 pantallas x 320/390/768/1024/1440), con Header real, nombres largos, menús/Escape, tablas pobladas, H1/breadcrumbs, geometría y selección CSV local. Referencia de las nueve pantallas D5.2 desde e53225a: 45 observaciones antes de migrar (los fallos esperados quedan registrados, no se declaran PASS). Capturas iniciales, cuenta y archivo seleccionado en `.validation.local/visual-d5.2/{before,after}`. HTTP simulado, sin confirmaciones ni backend real.
- PASS `hu34.ui.browser.mjs`: 320/390/768/1024/1440 y comportamiento HU34, sin llamadas backend; evidencia `.validation.local/visual-d5.2/academic-csv`. Revisión de capturas de Usuarios/Roles, Historial, Importar estudiantes y Asignaciones; perfiles nuevos eliminados por el helper.
- Revisión técnica: sin cambios de API, autenticación, permisos o negocio; escala y ancho públicos deliberados; sin selectores globales, tokens nuevos ni overflow:hidden añadido. Sin revisión humana; revisión técnica asistida por IA. Pendientes: comprobación autenticada con datos reales y deuda previa de ESLint/TODO, fuera de D5.2.

### Corrección tras captura de Información institucional

- D5.2 no detectaba la introducción externa a PageHeader: `.intro` conservaba `max-width:70ch` y `margin:auto`, desplazando el subtítulo respecto al H1. Se integra como `description` y se eliminan los estilos intro duplicados. Se mantiene narrow=960px.
- PASS: Node focalizado 48/48, build/TypeScript, ESLint del TSX y diff --check. Chrome pageLayout 45/45 y hu42-hu43.ui PASS a 320/390/768/1024/1440 con HTTP simulado; nueva comprobación del eje X del subtítulo y su margen de 8px. Capturas: `.validation.local/visual-d5.2-information/`. Sin revisión humana; revisión técnica asistida por IA.

## D5.3 - H1 de Gestión de estudiantes (2026-11-07)

- Rama ds/sync-arqmoc-erick, base 3db55bd, inicio limpio. Causa confirmada antes de editar en Chrome: encabezado local .headerTitles h1, font-size:var(--font-size-2xl), font-weight:600, line-height:var(--line-height-tight), margin:0; no usaba PageHeader. Contenedor local max1600 con gutters50. Docentes ya usaba el contrato compartido.
- Calculado antes (tamaño/peso/línea/margen): Estudiantes 24px/600/30px/0 en los cinco anchos; Docentes 24px/700/30px/0 a 320/390 y 32px/700/40px/0 a 768/1024/1440. Después: Estudiantes coincide exactamente con Docentes.
- Migrado AdminManageStudentsPage a PageContainer (max1280) y PageHeader (breadcrumbs, descripción y acciones). Eliminadas cabecera, breadcrumbs y contenedor CSS duplicados; estilos de botones conservados. Sin cambios en búsqueda, paginación, registro, CSV, estado, API o permisos; sin cambios de producción en otras pantallas.
- PASS: node --test (tests de Students, UI y adminBatch.integration) 174/174; npm.cmd run build (incluye tsc -b); npx.cmd eslint src/features/students/pages/AdminManageStudentsPage.tsx; git diff --check. La prueba de registro expande PageHeader para acceder a la misma acción y conserva sus asserts de recarga.
- Chrome con HTTP simulado: comparación Estudiantes/Docentes 10/10 y regresión pageLayout.browser 110/110 a 320/390/768/1024/1440. Valores computados, geometría, overflow y acciones: abrir/cancelar registro, abrir/cancelar cambio de estado, navegar a CSV; cero escrituras. Capturas y result.json antes/después en .validation.local/visual-d5.3/. Sin perfiles nuevos pendientes.
- Sin revisión humana; revisión técnica asistida por IA. Pendiente: comprobación con backend real, fuera del transporte simulado. Sin discrepancia H1 pendiente en los cinco anchos verificados.

## D6 - Validación funcional con backend real (2026-11-07)

- Rama ds/sync-arqmoc-erick, base 479c62f, inicio limpio. Frontend local (Vite 5173, este árbol) y backend local Laravel (127.0.0.1:8000, rama `Dev_Hector` `a69dae4`) disponibles; `/up` y `/api/v1/health` 200.
- Método: Chrome por CDP. Sesión iniciada a mano por el usuario (administrador y luego docente); el agente no vio ni registró credenciales. Durante cada recorrido se abortó toda petición distinta de GET/HEAD/OPTIONS: **0 escrituras en todo D6**. Solo se registraron rutas, estados HTTP y recuentos; no se ejecutaron creación, edición, publicación, importación ni cambios de estado.
- Validado con datos reales:
  - Portal público (inicio, calendario, noticias y detalle, información, servicios y detalle) a 1440/390px. Las rutas protegidas sin sesión redirigen a `/login`.
  - Las 24 rutas de administración (usuarios, roles, historial, auditoría, carreras, docentes y asignaciones, estudiantes, materias, periodos, aulas, importaciones CSV abiertas sin cargar archivo, portal: calendario, noticias, información y servicios; criterios, reportes, incidencias). Cada una con un `h1`, migas y sin desbordamiento.
  - Interacciones de administración: búsqueda de usuarios y estudiantes (al enviar), paginación de usuarios, estudiantes y auditoría (página 1 → 2 de 262), detalle de cuenta (diálogo con Escape), detalle de estudiante y docente.
  - Docente: Mis materias (selector de periodo), Mis exámenes, Estudiantes (lista de inscritos), inicio docente y formulario de programación a 1440/768/390. En el formulario: calendario con días pasados deshabilitados, disponibilidad de aulas por GET, día y aula disponible → «Confirmar Programación» habilitado (**no enviado**), guarda de navegación «Tienes cambios sin guardar» con Continuar/Descartar.
- Defecto corregido (`82c753d`): `<main>` anidado en `/admin` y `/admin/exam-reports`. `AdminLayout` ya aporta el `<main>` y `HomePage`/`ExamReportsPage` se comparten con `AppLayout`. Ahora `HomePage embedded` y la variante de administración de reportes usan `<div>`, y el CSS de inicio apunta a `.content` en lugar del elemento. `mainLandmarks.test.mjs`: 0/3 sin la corrección, 3/3 con ella. En backend real: un `<main>` por página y estilos de inicio idénticos (`flex` a 1440px, `block` a 390px).
- Descartados tras reproducir (no son defectos):
  - «búsqueda sin efecto»: filtra al enviar;
  - «Escape no cierra»: el evento de teclado del script estaba incompleto;
  - páginas «sin h1»: se midieron antes de terminar la carga;
  - `input type=time` «sin nombre»: tiene `label[for]`;
  - imágenes por URL en los detalles: son el logo de la cabecera.
- Bloqueos:
  - **Backend:** `GET /api/v1/exam-reports/catalog` y `/api/v1/admin/incidents/exams` devuelven 404 porque el backend local no define esas rutas. Afecta a reportes (administración y docente) e incidencias de administración. El frontend muestra el error con «Reintentar».
  - **Sin datos:** el docente no tiene exámenes (0), así que no se comprobaron el detalle, la edición, la asistencia, las infracciones, las expulsiones, los colaboradores, las habilitaciones ni el reparto offline. Crear un examen requiere autorización de escritura.
  - **Sin autorización:** escrituras reales (programar, editar, importar CSV, publicar), rol estudiante (QR, perfil), `hu41` y `sprint3.integration` (crean datos). `imageProxy` depende del `.env`.
  - **Menor, sin corregir:** `/favicon.ico` 404. `index.html` nunca declaró icono; elegirlo es una decisión de marca.
- Validación final: Node 867/868 (0 fallos, 1 `todo` del mínimo de calendario de D3); `tsc` OK; build OK; ESLint 36 = Arqmoc (0 nuevos); `git diff --check` OK. Batería browser simulada 24/24 en 479c62f. Tras la corrección, `pageLayout.browser` 111 PASS y `examReports.browser` sin errores.
- Sin revisión humana; revisión técnica asistida por IA.

## D7 - Cierre funcional y preparación para publicación (2026-11-07)

- Rama ds/sync-arqmoc-erick, base 1ceab94, inicio limpio. Mismo método de D6: sesión manual (docente y luego administrador), CDP con todo lo que no es GET/HEAD/OPTIONS abortado: **0 escrituras**. El backend no se modificó.
- **Matriz de contratos.** De 129 llamadas literales del frontend, 110 existen en el backend local (`Dev_Hector` `a69dae4`, 154 rutas según `artisan route:list`). Las 19 restantes pertenecen a 7 features: reportes, incidencias, infracciones, expulsiones, asistencia, anulación de ingresos y offline.
  - GET anónimo: «route could not be found» (404) en todas; las rutas de control existentes dan 401.
  - Esas rutas **sí existen en `origin/main` del backend (`ca126a6`)**. El checkout local va 25 commits por detrás de `origin/Dev_Hector` y 1 más hasta `origin/main`, con 3 migraciones pendientes.
  - Clasificación: **BLOQUEADO POR BACKEND**. Se resuelve actualizando el entorno local (lo hace el responsable del backend, con autorización y copia de la BD). No se sustituyeron por mocks ni se cambiaron rutas.
- Corregido `d56a046`: tras un «Reintentar» que vuelve a fallar, el foco caía a `<body>`. Nuevo hook compartido `useRetryFocus` en `DataTable`, `DataCardGrid` e `IncidentExamPicker`; solo devuelve el foco si se había perdido. Comprobado en backend real en Reportes (docente y administrador) e Incidencias: 1 GET, 1 alerta, foco en el botón. `retryFocus.test.mjs` falla sin el cableado.
- Corregido `e432b43`: el calendario público tenía un `<h1>` sin estilo (40px en todos los anchos). Ahora usa `PageContainer narrow` y `PageHeader`, igual que Noticias, Información y Servicios. En backend real: `h1` 24/32px, 960px y migas.
- Pendiente (no corregido): `/admin/academic-terms` (Periodos académicos) tiene un `h1` de 27,2/28,8px y no usa el contenedor de 1280px. Es una migración DS3 sin hacer (`academic-terms` ⏳), fuera del alcance de D7.
- Validación en backend real a 320/390/768/1024/1440, sin desbordamiento:
  - 16 rutas de administración (80 mediciones). Todas con `h1` 24/32px y 1280px, salvo `/admin` (portada) y Periodos.
  - 5 rutas docentes (25 mediciones).
  - 5 rutas públicas (25 mediciones).
  - Los 12 enlaces internos de las páginas docentes y públicas llevan a páginas válidas.
- Validación automatizada: Node 869/870 (0 fallos, 1 `todo` de D3); `tsc` OK; build OK; ESLint 36 = Arqmoc (0 nuevos); `git diff --check` OK. Batería browser simulada 24/24. Tras la corrección del calendario, `publicCalendar`, `eventVisibility`, `adminCalendarFocus`, `adminCalendarPendingEscape` y `pageLayout` (111) PASS. Las pruebas simuladas no cuentan como validación con backend real.
- Bloqueados: `hu40`, `hu41` y `sprint3.integration` (backend real con escrituras), `imageProxy` (`.env`), detalle y subpáginas de examen (el docente no tiene exámenes) y rol estudiante (sin cuenta de prueba).
- Plan de escritura preparado y **no ejecutado**: [D7_PLAN_PRUEBAS_ESCRITURA.md](../D7_PLAN_PRUEBAS_ESCRITURA.md). El backend no tiene `DELETE` de exámenes (solo cancelar); incidencias, expulsiones, anulaciones y preparación offline son irreversibles.
- Sin revisión humana; revisión técnica asistida por IA.

## DS3 - Unificación visual pendiente (2026-11-07)

- Rama ds/sync-arqmoc-erick, base 81f3663, inicio limpio. Solo frontend; backend no tocado; 0 escrituras (sesión manual de administrador, escrituras abortadas por CDP).
- DS3.1 `c6864f5` — Periodos académicos (`/admin/academic-terms`):
  - Causa: cabecera propia sobre clases legacy de `AdminRoomsPage.module.css` (H1 27,2/28,8px, sin `max-width`, separaciones de 22 y 7px).
  - Ahora usa `PageContainer labelledBy` y `PageHeader` (mismo `id` y `tabIndex` del H1, eyebrow, descripción, migas y acción). Se conservan «Volver al inicio» y el Snackbar.
  - `pageLayout.browser` falla antes (5/5 anchos) y pasa después.
  - Backend real: H1 24/700/30 y 32/700/40, 1280px, un `<main>`; Escape en el diálogo devuelve el foco a «+ Registrar periodo».
- DS3.2 `978c74b` — 404 de administración (ruta `*` bajo `AdminLayout`):
  - Antes: tarjeta propia con H1 `clamp()` (28,8–40px), sin 1280px y sin migas.
  - Ahora usa `PageContainer` y `PageHeader`. El enlace «Volver al inicio» sigue siendo `Link`: `Button`/`ButtonLink` siguen limitados al piloto de Aulas.
  - Backend real: 24/32px, 1280px y migas.
- DS3.3 `425c77b` — tokens: 4 colores literales sustituidos por tokens semánticos con valor idéntico en el tema claro activo (sin cambio visual): Colaboraciones `#fff` → `--color-on-primary`; Mis materias `#eaf3ff` → `--color-background` y `--brand-navy` ×2 → `--color-text`. `#bfdbfe`/`#eff6ff` no tienen token equivalente y se conservan. `#eff6fc` de Servicios se mantiene por la decisión de DS2.1g.
- Validación:
  - Automatizada: Node 869/870 (0 fallos, 1 `todo` de D3); `tsc` OK; build OK; ESLint 36 = Arqmoc (0 nuevos); `git diff --check` OK.
  - Browser simulado: 24/24 (`pageLayout` 121 PASS).
  - Backend real: 16 rutas de administración × 5 anchos, 80/80 dentro del contrato salvo `/admin` (portada); «Reintentar» conserva el foco.
- Pendientes de Design System (con evidencia; para DS4):
  - students: `TeacherSubjectStudentsPage` (H1 `clamp(24px, 4vw, 32px)`: 30,7px a 768), `ImportSubjectStudentsPage` (H1 `clamp(32px, 3vw, 36px)`), `StudentProfilePage` y `StudentQrPage` (`clamp(32px, 4vw, 40px)`; sin cuenta de estudiante para verificarlas).
  - exams: `EntryControlPage` (H1 `--font-size-xl` y ancho de 1120px; control de ingreso en vivo, riesgo alto) y `TeacherExamDetailPage` (sin datos para verificar).
  - offline-entry: H1 `clamp(26,4–35,2px)` y ancho de 1300px.
  - home: portada con escala propia.
  - Botones de Periodos, Materias y demás pantallas (DS2.2d: `Button` solo en Aulas).
  - `AdminModulePage` no tiene ruta (código muerto; no se modifica).
- Sin revisión humana; revisión técnica asistida por IA.

## DS4.1 - Pantallas docentes de estudiantes y botones DS2.2d (2026-11-07) ✅

- Rama ds/sync-arqmoc-erick, base afb389b, inicio limpio. Solo frontend; backend no tocado; 0 escrituras (transporte simulado: solo GET).
- DS4.1a `54988fb` — `TeacherSubjectStudentsPage` (`/teacher/students/:id`) e `ImportSubjectStudentsPage` (`/teacher/students/:id/import`):
  - Causa: cabeceras propias (H1 `clamp(24px, 4vw, 32px)` y `clamp(32px, 3vw, 36px)`), tarjeta de 1120px y botones con clases locales.
  - Ahora: conservan su `<main>` (AppLayout no lo aporta; lista `ownsMain`) con `PageContainer labelledBy` y `PageHeader`. El estado de error comparte el único `PageHeader` (un solo H1). Acciones con `Button`/`ButtonLink`; solo consulta: ambos `Button` deshabilitados, como antes. `--brand-navy` → `--color-text` (mismo valor).
  - Sin cambios en carga de datos, inscripción, rutas ni textos. `SubjectStudentsTable` conserva `.status`.
- DS2.2d `b750e55` — botones de Materias y Periodos: 32 `Button` y 1 `ButtonLink` («+ Importar materias (CSV)»). Todos los botones migrados ya declaraban `type` (sin cambio de semántica submit). El envoltorio `.headerActions` de Materias pasa a fragmento, como en Aulas, para que `.headerActions a` no anule el borde de `ButtonLink`. CSS de Aulas (compartido) sin cambios.
  - Excepciones: acciones de fila (`AdminSubjectsTable`, `AcademicTermsTable`), cerrar × de los modales e importación CSV compartida (`CsvImport.module.css`). `Field` no forma parte de este paquete.
- Contratos: listas cerradas de `button.test.mjs` y `pageLayout.test.mjs` ampliadas; `pageLayout.browser` cubre las pantallas docentes (gestionable, solo consulta, error e importación CSV) y abre el diálogo de registro en Materias y Periodos (Escape y retorno de foco).
- Validación:
  - Automatizada: Node 869/870 (0 fallos, 1 `todo` de D3); `tsc` OK; build OK; ESLint 36 = línea base (0 nuevos); `git diff --check` OK.
  - Browser simulado: `pageLayout` 140/140 (28 pantallas × 5 anchos); `rooms.browser` 10/10.
  - Backend real (sesión docente iniciada a mano por el usuario en un Chrome aislado con CDP; Vite 5173 con este árbol): toda petición distinta de GET/HEAD/OPTIONS se abortaba desde antes de navegar; **0 escrituras** (ningún intento). Solo se registraron rutas, estados y medidas; sin capturas ni datos personales. **21/21 PASS**:
    - `/teacher/students/:id` (oferta gestionable), `/teacher/students/:id/import` y el estado de error de ambas (id inexistente) a 320/390/768/1024/1440 (20/20): un solo `<main>` y ningún anidado, un H1 (24/700 hasta 640 y 32/700 desde 768), `PageContainer` como `section` con `aria-labelledby`, `max-width` 1280 al ancho disponible, separación de cabecera 24px, migas visibles con `aria-current` y enlaces esperados, eyebrow «Materia» solo con datos, 2 `Button`/`ButtonLink` visibles, 0 clases de botón antiguas, formulario CSV presente (sin cargar archivo), alerta en error, sin desbordamiento ni excepciones.
    - Inscripción manual a 1440: foco inicial en el diálogo; Escape lo cierra y devuelve el foco a «+ Agregar estudiante manualmente» (no se envió nada).
    - API: `GET /api/v1/me`, `/me/collaborations`, `/teacher/dashboard/subjects` y `/course-offerings/:id/enrollments` → 200 (los 204 son preflight `OPTIONS`).
    - Descartado tras reproducir: «Escape no cierra» en la primera pasada. La ventana real no tenía el foco del sistema; con `Emulation.setFocusEmulationEnabled` (y también con clic real) cierra y devuelve el foco.
    - Sin cubrir en real: oferta de solo consulta (el docente no tiene ninguna enlazada en el periodo; cubierta con transporte simulado).
- Pendientes para DS4.2 (students y restos de DS2.2d):
  - Panel CSV compartido (`CsvImport.module.css`, usado por Aulas, Materias, Estudiantes, Ofertas e inscripción docente): botones propios (`templateButton`, `continueButton`, etc.), H1 legacy y `.page` con gradiente; migrar en una subetapa con revisión de los cinco consumidores.
  - `ManualStudentEnrollmentDialog`/`AddStudentsModal`: botones propios y conflicto de apilamiento con Snackbar pendiente desde DS1.4b.
  - `StudentProfilePage` y `StudentQrPage` (H1 `clamp(32px, 4vw, 40px)`): requieren cuenta de estudiante para validar.
  - Acciones de fila y cerrar × en Aulas, Materias y Periodos; `Field`/controles en Materias y Periodos.
  - Validar en real una oferta de solo consulta cuando exista una.
- Sin revisión humana; revisión técnica asistida por IA.

## DS4.2a - Unificación del panel CSV compartido (2026-11-07) ✅

- Rama ds/sync-arqmoc-erick, base b23e914, inicio limpio. Solo frontend; backend no tocado; 0 escrituras (transporte simulado; ninguna importación ejecutada).
- D0: el «panel compartido» son **dos familias de estilos**. A: `shared/styles/CsvImport.module.css` (+ `CsvImportReport`): Aulas, Materias, Inscripción docente y el dropzone de Ofertas (`SubjectCsvDropzone` con estilos inyectados). B: `ImportStudentsPage.module.css` + `StudentImportDesign.module.css`: Estudiantes, Ofertas (`OfferingImport.module.css` las importa) y un sexto consumidor, `AcademicCsvImportPanel` (elegibilidad), que se migra para que sus botones no pierdan el estilo.
- Commit `3bdfcab` (23 archivos):
  - 60 `<button>` nativos → `Button` (`primary`: continuar/seleccionar archivo; `secondary`: cancelar, plantilla, cambiar/quitar archivo, descarga, paginación). Tamaño `md` (44px, objetivo táctil). Todos declaraban `type="button"`. La clase local se conserva solo para layout (`min-width`, `white-space`, `flex`, márgenes), sin propiedades que compitan con `.button`.
  - Familia A: eliminada la cabecera legacy muerta desde DS4.1a (`.page`, `.content`, `.breadcrumb`, `.pageHeader` y 3 reglas `:global(...):has(.page)`); 900px → 1024px.
  - Familia B: 33 colores literales y 13 `font-size` en px → tokens; `var(--x, #fallback)` sin fallback (los tokens existen); `--brand-*` → semánticos (idénticos: navy, blue-light, pink, pink-light; con cambio: `--brand-blue` → `--color-primary`, como la familia A, y crimson → `--color-accent-strong`); sombra → `--shadow-sm`; tonos de revisión con `--color-success*`, `--color-accent*` y `--color-error*` (contraste 4,6 / 5,1 / 5,3:1; el aviso anterior daba 3,6:1, por debajo de AA); `.panelTitle` igual que el `h2` de la familia A (mismo tamaño y peso, color `--color-text-primary`); 820/720px → 768px; las etiquetas largas pueden partirse en paneles estrechos.
  - Sin cambios en carga de archivos, validación, mensajes, estados, borradores ni llamadas a la API. Dos pruebas Node que inspeccionan el árbol sustituyen `Button` por `'button'` (aserciones intactas).
- Validación:
  - Prueba nueva `shared/tests/csvImportDesignSystem.test.mjs`: **0/4 en b23e914, 4/4 ahora** (tokens, clases de botón solo de layout, cabecera legacy eliminada y paneles sin botones nativos legacy ni H1).
  - `pageLayout.browser`: los 5 importadores seleccionan un CSV local y comprueban jerarquía de títulos (h1 → h2 sin saltos), botones del DS y Tab hasta «Descargar plantilla» con foco visible. **Con las fuentes de b23e914 fallan los 5** (4 botones legacy, 0 del DS); ahora **140/140** a 320/390/768/1024/1440, con un `<main>` y sin desbordamiento.
  - Regresión: `rooms.browser` 10/10; `hu34.ui.browser` PASS (detectó 4px de desborde a 320px en elegibilidad, corregido con el salto de línea); Node 873/874 (0 fallos, 1 `todo` de D3); `tsc` OK; build OK; ESLint 36 = línea base; `git diff --check` OK.
- Pendientes:
  - Backend real de las 5 importaciones (sin cargar archivo): requiere sesión de administrador y docente; no disponible en esta etapa.
  - Botones de paginación de `StudentImportSummary` (`summaryItem`, chips de filtro: fuera del alcance de `Button`) y `academicTemplateButton` de elegibilidad (fija `min-height: 45px` con más especificidad).
  - Resto de DS4.2: `ManualStudentEnrollmentDialog`/`AddStudentsModal` (✅ DS4.2b), `StudentProfilePage`/`StudentQrPage`, acciones de fila y × de cierre, `Field` en Materias y Periodos.
- Sin revisión humana; revisión técnica asistida por IA.

## DS4.2b - Diálogos de estudiantes y Snackbar (2026-11-07) ✅

- Rama ds/sync-arqmoc-erick, base 8caf9e4, inicio limpio. Solo frontend; backend no tocado; 0 escrituras (transporte simulado dentro del navegador).
- D0:
  - `AddStudentsModal.tsx` **no tiene consumidores** (código muerto); su CSS sí se usa: `ManualStudentEnrollmentDialog`, `CreateStudentModal` y `CollaborationModal` (≈20 modales de colaboraciones, exámenes, elegibilidad, incidencias, offline y usuarios).
  - `ManualStudentEnrollmentDialog`: `<dialog>` nativo con `showModal()` (top layer). `CreateStudentModal`: dentro de `CollaborationModal`, overlay `div` con `z-index: 30`.
  - Reproducción (nueva `studentDialogs.browser.mjs`, antes de cambiar código): **10/10 FAIL**. En «Registrar estudiante» la cabecera sticky (50) se pinta sobre el overlay (30) y tapa el título y el × del modal **en los cinco anchos** (a 320px, de 38 a 162px); a 320/390 la cabecera responde a clics con el modal abierto. El Snackbar (20) queda bajo el overlay.
  - Causa: overlay fuera de la top layer (no falta de un `z-index` mayor). Experimento en Chrome: con un `<dialog>` modal abierto nada exterior es operable, ni un *popover* de la top layer, así que «toast sobre el modal» no es alcanzable sin romper la semántica modal (corrige la hipótesis de `tokens.md`).
  - Descartado: subir el overlay de `CollaborationModal` a `--z-dialog` (global: ≈20 modales y el orden con `ConfirmDialog` 200, `StudentDetailModal` 100…) y usar `PortalDialog` (su regla `.dialog button`, especificidad 0,1,1, anula `Button`).
- Commit `871b314` (10 archivos):
  - `StudentDialog` (local de students): el `<dialog>` nativo que ya usaba la inscripción manual, extraído con foco inicial configurable, Escape vía `cancel`, devolución del foco, `useBodyScrollLock`, bloqueo mientras está ocupado y cierre opcional por fondo. Sin `z-index`.
  - `ManualStudentEnrollmentDialog` y `CreateStudentModal` lo usan; cada uno conserva su comportamiento (inscripción: foco en SIS, sin cierre por fondo; registro: foco en el diálogo, cierre por fondo si no está ocupado). Botones con `Button` (incluido «Reintentar» del catálogo). Fondo del backdrop y título con tokens (`--brand-navy` → `--color-text`, idéntico). `CollaborationModal` intacto.
  - Pruebas: `adminBatch.integration` sustituye `Button` por `'button'` en su arnés (aserciones intactas); `pageLayout.browser` acepta el `<dialog>` nativo (`dialog[open]`); contrato de `Button` ampliado.
- Validación:
  - `studentDialogs.browser`: S1 (docente: añadir, aviso de éxito visible, reabrir) y S2 (administración: aviso visible, «Registrar estudiante») × 320/390/768/1024/1440. Comprueba controles del diálogo sin tapar, cabecera inerte con clic real, botones del DS, Tab dentro, Escape, foco devuelto y × del aviso operable tras cerrar. **Antes (fuentes de 8caf9e4): 10/10 FAIL; ahora: 10/10 PASS.**
  - `pageLayout.browser` 140/140; Node 873/874 (0 fallos, 1 `todo` de D3); `tsc` OK; build OK; ESLint 36 = línea base; `git diff --check` OK.
- Pendientes para DS4.2c:
  - `PortalDialog`: neutralizar `.dialog button` para admitir `Button` y una opción de foco inicial; después, migrar `StudentDialog` a `PortalDialog` (subetapa de componente compartido).
  - `CollaborationModal` (≈20 consumidores): mismo defecto de cabecera sobre el overlay; requiere su propia subetapa con validación de los consumidores y del orden con `ConfirmDialog`.
  - `AddStudentsModal.tsx` muerto (y sus clases `.primaryButton`/`.secondaryButton`/`.summaryBox`): decidir su eliminación.
  - El Snackbar sigue con `z-index: 20` y medidas en rem propias (`snackbar.css`): migrar a `--z-toast` y tokens en su subetapa.
  - `StudentProfilePage`/`StudentQrPage` (cuenta de estudiante), acciones de fila y ×, `Field` en Materias y Periodos.
- Nota: el mensaje de `871b314` menciona «two node harnesses»; en ese commit solo cambia uno (`adminBatch.integration`).
- Sin revisión humana; revisión técnica asistida por IA.

## DS4.2c.1 - Consolidación de PortalDialog (2026-11-07) ✅

- Rama ds/sync-arqmoc-erick, base 801254f, inicio limpio. Solo frontend; backend no tocado; 0 escrituras (sin HTTP en las pruebas nuevas).
- D0:
  - Consumidores directos de `PortalDialog`: `CalendarModal` y `PortalModal` (`PortalUi`), y a través de ellos `AdminEventDialog`, `PublicEventDialog`, `AdminNewsPage`, `AdminServicesPage` y `AdminInformationPage`. Ninguno usaba `Button`.
  - Reproducción (nueva `shared/tests/portalDialog.browser.mjs`): **5/5 FAIL en 801254f**. `.dialog button` (0,1,1) anula `Button` (0,1,0): un primario se ve blanco, 36px y radio 6px; deshabilitado, opacidad 0,5. El foco inicial no era configurable.
  - Diferencias de contrato `PortalDialog` / `StudentDialog`:

    | Contrato | PortalDialog | Inscripción manual | Registro de estudiante |
    |---|---|---|---|
    | Foco inicial | × «Cerrar ventana» (ahora configurable) | campo SIS | el propio diálogo |
    | Nombre del × | «Cerrar ventana» | «Cerrar modal» | «Cerrar modal» |
    | Escape | `keydown` + `cancel`, diálogos anidados | `cancel` | `cancel` |
    | Clic fuera | no cierra | no cierra | cierra si no está ocupado |
    | Ocupado | bloquea × y Escape | bloquea y reenfoca el diálogo | igual |
    | Cabecera | solo título | antetítulo + título + subtítulo | título |
    | Caja | 720px, 24px, `--radius-md` | 560px, `--space-5`, `--radius-lg`, `--shadow-lg` | igual |
    | Devolución del foco y bloqueo de scroll | sí | sí | sí |

- Commit `2a91425` (5 archivos):
  - `Button` emite `data-ds-button` (antes de `disabled`); las tres reglas genéricas de `PortalDialog` lo excluyen con `:where(:not([data-ds-button]))`, con la misma especificidad, así que los botones propios de los diálogos no cambian. Sin `z-index` ni CSS global.
  - `PortalDialog` admite `initialFocus` (ref opcional); por defecto, «Cerrar ventana» como antes.
  - `StudentDialog` **no** pasa a `PortalDialog`: cambiaría el nombre del ×, el foco inicial y el cierre por fondo del registro, la cabecera, la caja y el reenfoque al estar ocupado. Se mantiene hasta que `PortalDialog` cubra esos contratos.
- Validación:
  - `portalDialog.browser`: **antes 5/5 FAIL; ahora 5/5 PASS** (aspecto de `Button`, botones propios idénticos, foco inicial por defecto y configurable, Escape, clic fuera, devolución del foco, Snackbar tras cerrar y controles sin tapar a 320–1440px). Guarda Node de los selectores en `button.test.mjs` (falla con el CSS anterior).
  - Consumidores (simulados): `confirmDialogEscape`, `eventVisibility`, `newsEditor`, `adminCalendarFocus`, `adminCalendarPendingEscape`, `hu42-hu43.ui`; además `studentDialogs` 10/10, `rooms` 10/10 y `pageLayout` 140/140. No se ejecutan `hu40`/`hu41` (backend real).
  - Node 874/875 (0 fallos, 1 `todo` de D3); `tsc` OK; build OK; ESLint 36 = línea base; `git diff --check` OK. Una prueba SSR de importación esperaba `disabled` como último atributo; se resolvió colocando el marcador antes de `disabled`.
- Plan para `CollaborationModal` (DS4.2c.2, sin ejecutar):
  1. Inventariar sus ≈20 consumidores con su foco inicial, cierre por fondo, Escape anidado, uso de `busy` y diálogos que abren encima (`ConfirmDialog` 200, `SharedRoomConsentModal` 120, overlays propios 100/1000).
  2. Regresión de navegador por familia (colaboraciones, exámenes/control de ingreso, elegibilidad, incidencias, offline, usuarios) que reproduzca la cabecera sobre el overlay.
  3. Reimplementar `CollaborationModal` sobre `<dialog>` nativo (top layer) conservando su API (`title`, `busy`, `onClose`, cierre por fondo, foco en el contenedor, «Cerrar modal»), sin `z-index`; verificar que los diálogos que abre encima siguen visibles (también en la top layer o anidados).
  4. Con los contratos ya cubiertos, unificar `StudentDialog` con `CollaborationModal`/`PortalDialog` y retirar `AddStudentsModal.tsx` (muerto).
  5. Validar el control de ingreso en vivo (`EntryControlPage`) aparte, por su riesgo.
- Sin revisión humana; revisión técnica asistida por IA.

## DS4.2c.2 - CollaborationModal en la top layer (2026-11-08) ✅

- Rama ds/sync-arqmoc-erick, base 8a7af8c, inicio limpio. Solo frontend; backend no tocado; 0 escrituras reales (HTTP solo contra un fixture en proceso).
- D0:
  - `CollaborationModal` es un overlay `div` (`z-index: 30`, CSS de `AddStudentsModal.module.css`) bajo la cabecera sticky (`z-index: 50`). 17 consumidores en 6 familias: colaboraciones (3), elegibilidad (2), exámenes y control de ingreso (5), incidencias (1), offline (4) y usuarios (2).
  - El CSS de varios consumidores depende del DOM actual (`.layer > div`, `.modalScope > div`, `[role='dialog'] > div:first-child`, `[aria-label='Cerrar modal']`) y `EntryControlStudentModal` hace scroll con `dialog.parentElement`. Migrar a `<dialog>` obligaba a reescribir ese CSS (control de ingreso).
  - `ConfirmDialog` es no nativo por defecto (`z-index: 200`); ningún consumidor lo abre como hermano mientras el modal está abierto (en `AdminManageUsersPage` son excluyentes). Snackbar (`z-index: 20`) ya quedaba bajo el overlay. Ningún consumidor envía portales al `body` desde dentro del modal.
- Decisión aprobada: `popover="manual"` en el overlay existente en lugar de `<dialog>` (cambia el paso 3 del plan de DS4.2c.1).
- Reproducción (nueva `features/collaborations/tests/collaborationModal.browser.mjs`): **5/5 FAIL en 8a7af8c**. La cabecera tapa «Cerrar modal», recibe clics a través del overlay y por eso el clic fuera no cierra.
- Commit `5b9ee55` (3 archivos):
  - El overlay recibe `popover="manual"` y se abre con `showPopover()` en `useLayoutEffect`: top layer sin `z-index`. Mismo DOM, API y consumidores. Sin soporte de Popover API se conserva el apilamiento anterior.
  - Un popover manual **no es modal**: foco inicial en el contenedor, trampa de Tab, Escape (con `stopPropagation` para anidados), clic fuera y `busy` siguen con sus manejadores. Nuevo: `mousedown` sobre el overlay ya no lleva el foco a `<body>` (antes, Tab desde ahí alcanzaba la página; la prueba lo detectó con `busy`).
  - Un modal montado abierto dentro de otro se vuelve a mostrar para quedar encima (sin ello, 5/5 FAIL en el caso de montaje simultáneo).
  - `.overlay` neutraliza la caja del `[popover]` del navegador (ancho/alto, margen, borde, `overflow`, color).
- Validación:
  - `collaborationModal.browser` **antes 5/5 FAIL; ahora 5/5 PASS** a 320/390/768/1024/1440px: cabecera no alcanzable ni encima; foco inicial; Tab/Shift+Tab sin salir; clic en la cabecera o en la página no las alcanza; Escape y × devuelven el foco; Snackbar usable tras cerrar; `busy` bloquea Escape, fondo y × y mantiene el foco; `ConfirmDialog` div y nativo encima con Escape solo para él; modal anidado (y montado a la vez) encima; `EntryControlPage` real: detalle de estudiante, confirmación manual (`busy` durante el POST simulado) e «Ingreso registrado».
  - Regresiones: `entryAnnulment` (historial y anulación en control de ingreso), `incidents`, `portalDialog` 5/5, `confirmDialogEscape`, `studentDialogs` 10/10 y `pageLayout` 140/140 PASS. Node focal 458/459 y completo 874/875 (0 fallos, 1 `todo` de D3); build OK; ESLint 36 = línea base; `git diff --check` OK.
- Limitaciones:
  - No es modal nativo: el fondo no es `inert`. La protección es la misma que antes (overlay a pantalla completa, `aria-modal`, trampa de Tab, bloqueo de scroll), ahora además sobre la cabecera.
  - Si un `CollaborationModal` se abriera sobre un `<dialog>` modal ya abierto, quedaría inerte; hoy ningún flujo lo hace.
  - Previo y ajeno al popover: con montaje simultáneo de modal y anidado, el foco queda en el exterior (Escape cerraría el exterior). Ningún consumidor monta así.
  - Elegibilidad, offline y usuarios sin prueba de navegador propia: cubiertos por el componente común y sus pruebas Node.
- Proceso Node abierto: las pruebas de esta etapa no dejan procesos (comparado antes/después). Hallazgos: (1) un `npm run dev`/Vite huérfano en el puerto 5173 (padre ya inexistente), no lanzado por las pruebas, que no se detuvo; (2) los scripts antiguos con `browserHarness.mjs` (7) o `mkdtemp` propio (3, p. ej. `incidents`) solo hacen `chrome.kill()` y no borran el perfil: quedan `hu28-browser-*` y `eida-hu27-*` en `%TEMP%`. Propuesta: migrarlos a `browserProfile.mjs` en una subetapa aparte.
- Siguiente: unificación visual docente/estudiante, revisión de «Crear examen», componentes pendientes (`StudentDialog` sobre la familia común, retirar `AddStudentsModal.tsx`) y DS5.
- Sin revisión humana; revisión técnica asistida por IA.

## U1/U2 - Unificación visual docente/estudiante (2026-11-08) ✅

- Rama ds/sync-arqmoc-erick, base dcc36f9, inicio limpio. Solo frontend; backend no tocado; 0 escrituras (HTTP simulado, solo GET).
- D0 (inventario): las listas docentes (Mis materias, Estudiantes, Mis exámenes) metían migas y un `h1` propio dentro de una tarjeta blanca de 1120px; las páginas de estudiante (Mi perfil, Mis exámenes) usaban `h1` `clamp(32px, 4vw, 40px)` con subrayado de acento y padding propio. Fondos ya idénticos (`#eaf3ff` = `--color-background` = `--color-surface-soft`). Crear examen ya seguía el patrón objetivo (cabecera sobre el fondo, contenido en tarjetas).
- Reproducción (`pageLayout.browser`, 5 pantallas nuevas): **25/25 FAIL antes** (docentes: `h1` sobre la tarjeta, sin 1280px, desalineado; estudiante: `h1` 32/40px, separaciones 32/12px, sin 1280px).
- U1 `04ce3aa` — listas docentes: conservan su `<main>` y usan `PageContainer labelledBy` + `PageHeader` (mismos título, descripción y migas). El contenido sigue en su tarjeta (filtros, listas, estados y paginación sin cambios), ahora alineada con la cabecera al ancho del contenedor. Mis exámenes usa el modificador aditivo `.contentFull`: `TeacherExamsPage.module.css` es compartido y conserva 1120px para sus otros consumidores. Eliminadas las reglas `.page`/`.pageHeader` sin uso de los dos módulos propios.
- U2 `a08bdfc` — estudiante: `PageContainer` + `PageHeader` dentro del `<main>` de `StudentLayout` (sin cambios). `h1` 32/24px. Subrayado conservado provisionalmente (decisión 10). Paneles, aviso, pestañas, tarjetas y foto sin cambios. No se añadieron migas (nunca las tuvieron).
- Diferencias resueltas: `h1` 32px escritorio / 24px móvil, bold, línea 40/30px en las cinco; cabecera y migas fuera de la tarjeta; ancho 1280px con el mismo padding y alineación que administración; separaciones de cabecera 24px y descripción 8px; un solo `<main>`; sin desbordamiento.
- Validación:
  - `pageLayout.browser` **165/165** (las 5 nuevas 25/25 a 320/390/768/1024/1440, más las 28 anteriores); comprobación de tarjeta de contenido (docente) y de acento, paneles y `main` de `StudentLayout` (estudiante).
  - Programar Evaluación: `examCreateDesignGuard.browser` **5/5 idéntica a dcc36f9** tras U1 y tras U2 (250 elementos; dos columnas a 1440px, una por debajo de 1080px; calendario, aulas, horario y barra inferior). Sensibilidad comprobada: un cambio temporal del tamaño de su `h1` da 5/5 FAIL.
  - Node 874/875 (0 fallos, 1 `todo` de D3); `pageLayout.test` amplía su lista cerrada; `studentQrPresentation` comprueba la cabecera a través de `PageHeader`. Build OK; ESLint 36 = línea base; `git diff --check` OK.
- Pendientes:
  - Programar Evaluación ya **desborda horizontalmente a 320px en la base** (defecto previo, no corregido por la decisión 9; la guarda exige que no cambie). Corregirlo solo como arreglo puntual autorizado.
  - Decisión 10 (subrayado de estudiante) y migas en las páginas de estudiante: requieren decisión de diseño.
  - Sin cuenta de estudiante: U2 validada solo con transporte simulado.
  - **U3** (sin ejecutar): subpáginas de examen, una familia por vez — detalle (`TeacherExamDetailPage`), colaboradores (`ExamCollaboratorsPage`, `CollaboratorPage`), habilitaciones (`ExamEligibilitiesPage`, `EligibilityAutomationPage`), reportes/incidencias/infracciones/expulsiones (`Incidents.module.css`, cabecera `.heading`) y reparto offline (`OfflineShared.module.css`, `h1` `clamp` y 1300px). Comparten `TeacherExamsPage.module.css` `.page/.content` (9 consumidores). Control de ingreso, en etapa propia. Crear/Editar examen excluidas (decisión 9).
- Sin revisión humana; revisión técnica asistida por IA.

## U3.1 - Detalle del examen y corrección de 320px en Programar Evaluación (2026-11-08) ✅

- Rama ds/sync-arqmoc-erick, base 4ee41b8, inicio limpio. Solo frontend; backend no tocado; 0 escrituras (HTTP simulado, solo GET).
- D0 de U3 (inventario de las cinco familias): `TeacherExamsPage.module.css` (`.page/.content/.pageHeader/.state`) tiene 9 consumidores (Mis exámenes, detalle, colaboradores ×2, habilitaciones ×2, control de ingreso, su lista y `ExamPageStateSection` de Crear/Editar). **No se modifica**: cada página deja de usar esas clases en su propio JSX. `TeacherExamDetailPage.module.css` también lo importa Editar examen (solo `.backLink`, intacta).
- U3.1 `dd7cdfe` — `TeacherExamDetailPage`:
  - Antes (reproducido, `pageLayout.browser` 10/10 FAIL): caja de 1120px de `TeacherExamsPage` vuelta transparente por anulaciones locales, migas y `h1` propios, cabecera con 16px + 20px.
  - Ahora: conserva su `<main>` con el ámbito `.detailPage` y usa `PageContainer labelledBy` + `PageHeader` con el mismo título (nombre del examen o «Detalle del examen»), descripción (materia · código) y migas (incluido el enlace a `/teacher/exams` con la búsqueda). Tarjetas de sección, navegación de incidencias, preparación del ingreso, normas, edición y cancelación sin cambios. Eliminadas solo `.detailPage .detailContent` y `.detailPage .header` (obsoletas por el cambio).
- Guardas: `examCreateDesignGuard.browser` cubre también **Editar examen** (`EIDA_EXAM_GUARD_SCREEN=edit`), congela transiciones antes de medir (una tarjeta de aula a mitad de transición daba un falso positivo) y usa la forma real de las franjas ocupadas.
- Corrección autorizada `f9348a8` — Programar Evaluación a 320px:
  - Causa: la píldora de validación del banner («Selecciona fecha, hora y un aula disponible») tiene `flex-shrink: 0` y no podía partir su texto; la página llegaba a 357px de ancho.
  - Ajuste mínimo: `max-width: 100%` en `.statusPill` **solo por debajo de 390px**. Con 480px cambiaba la vista aprobada a 390px (la píldora ya excedía el banner sin desbordar la página; pasaba a dos líneas, +18px).
  - Validación con `EIDA_EXAM_GUARD_FIX320=1` frente a `dd7cdfe`: Programar Evaluación 5/5 (320px sin desbordamiento y mismas referencias; 390/768/1024/1440px idénticos) y Editar examen 5/5 (idéntica en todos los anchos). La guarda por defecto frente al nuevo HEAD: 5/5.
- Validación de U3.1: `pageLayout.browser` **175/175** (detalle cargado y error 10/10, antes 0/10; un solo `<main>`, sin desbordamiento, sin tarjeta envolvente, secciones y acciones presentes); guardas Programar Evaluación y Editar examen 5/5 idénticas a 4ee41b8; Node 874/875; `tsc` + build OK; ESLint 36 = línea base, **0 errores en los archivos tocados** y sin reglas con tipos (los 36 son previos); `git diff --check` OK.
- Pendientes:
  - Programar Evaluación a 320px (previo, sin desbordar la página): en las tarjetas de aula, «Ver días libres» se superpone al nombre y la insignia verde queda recortada. No se corrige (diseño aprobado; requiere autorización).
  - Familias 2–5 de U3 (colaboradores, habilitaciones, reportes/incidencias/infracciones/expulsiones/asistencia, reparto offline).
- Sin revisión humana; revisión técnica asistida por IA.

## U3.2 - Colaboradores y tarjetas de aula a 320px (2026-11-08) ✅

- Rama ds/sync-arqmoc-erick, base fe9b780, inicio limpio. Solo frontend; backend no tocado; 0 escrituras (HTTP simulado, solo GET).
- U3.2 `7dc7d53` — `ExamCollaboratorsPage` (`/teacher/exams/:id/collaborators`) y `CollaboratorPage` (`/collaborator`):
  - Antes (reproducido, `pageLayout.browser` 20/20 FAIL): migas y `h1` dentro de la tarjeta blanca de 1120px de `TeacherExamsPage.module.css`.
  - Ahora: conservan su `<main>` con `PageContainer labelledBy` + `PageHeader`; mismos títulos y descripciones. **Migas exactamente iguales** («Mis exámenes › Colaboradores»; la página del colaborador sigue sin migas). El contenido sigue en su tarjeta al ancho del contenedor con el modificador existente `.contentFull`: **ningún CSS modificado**. Tarjeta del examen, búsqueda, tabla, estados y diálogos de asignar/detalle/revocar sin cambios.
  - Pruebas: `pageLayout.browser` añade ambas páginas cargadas y en error (500 simulado y anulación por pantalla de `/me/collaborations`) y abre/cierra «Asignar colaborador» (top layer, foco dentro, Escape devuelve el foco, solo GET). El stub de `useAuth` puede exponer un usuario por pantalla (para `CollaborationsProvider`) sin afectar a las demás.
- Corrección autorizada `81671d7` — tarjetas de aula de Programar Evaluación a 320px:
  - Causa: la cabecera de la tarjeta es una fila sin salto; «Ver días libres» (`nowrap`, sin encoger) tapaba nombre y capacidad y la insignia «★ Adecuada a tu cupo» quedaba recortada.
  - Ajuste: `flex-wrap: wrap` en `.roomCardHeader` y `.roomIdentityGroup` **solo por debajo de 390px**.
  - Regresión nueva en `examCreateDesignGuard`: en cada tarjeta, superposición entre nombre/capacidad/recomendación/estado o elementos fuera de la tarjeta. Falla antes a 320px; debe ser vacía por debajo de 390px y, desde 390px, igual a la base.
- Validación: `pageLayout.browser` **195/195** (colaboradores 20/20, antes 0/20); `assignCollaborator.integration` 21/21 sin cambios; guardas Programar Evaluación y Editar examen 5/5 idénticas a fe9b780 tras U3.2 y, con `EIDA_EXAM_GUARD_FIX320=1` frente a 7dc7d53, 5/5 tras la corrección (320px corregido; 390/768/1024/1440px idénticos); Node 874/875; `tsc` + build OK; **lista de errores ESLint idéntica a la base de 36** (0 nuevos); `git diff --check` OK.
- Pendientes:
  - **A 390px el diseño aprobado aún muestra la insignia de recomendación y la capacidad tocando «Ver días libres»** (detectado por la regresión). No se cambia: la autorización exigía 390px o más intactos. Requiere decisión.
  - Migas de colaboradores sin «Inicio» ni «Detalle del examen» y página del colaborador sin migas: se conservan por decisión; alinearlas requiere autorización (añade texto).
- Sin revisión humana; revisión técnica asistida por IA.

## U3.3 - Habilitaciones y tarjetas de aula hasta 479px (2026-11-08) ✅

- Rama ds/sync-arqmoc-erick, base ffbb8bc, inicio limpio. Solo frontend; backend no tocado; 0 escrituras (HTTP simulado).
- U3.3 `f90c9c0` — `ExamEligibilitiesPage` y `EligibilityAutomationPage`:
  - Antes (reproducido con el nuevo contrato de página de `hu34.ui.browser`, 30/30 FAIL): migas, `h1` y enlaces dentro de la tarjeta blanca de 1120px; en los estados de identificador no válido, `h1` sin estilo de 40px.
  - Ahora: `PageContainer labelledBy` + `PageHeader` con los mismos títulos, descripciones (incluido el nombre del examen) y **migas exactas**; los estados de identificador no válido usan el mismo contrato con un solo `h1` y sin migas (como antes).
  - «Habilitación automática», «Volver al examen» y «Volver a Habilitaciones» pasan a las acciones de `PageHeader` con el mismo texto, destino, clases y comportamiento. Ajuste local mínimo `.headerActions` (columna) en `Eligibilities.module.css`: mantiene «Volver al examen» en su propia línea, que es una aserción previa de HU34. Ningún CSS compartido cambia; contenido en su tarjeta con `.contentFull`.
  - Pestañas, configuración, vista previa, historial, CSV, validaciones y lógica de HU34 sin cambios (el diff mayor de la página automática es reindentación).
  - `pageLayout.test` admite un recuento exacto de 2 `<main>`/`PageHeader` en estas dos páginas: su rama de identificador no válido es excluyente (en ejecución hay uno; lo comprueba `hu34.ui.browser`).
- Corrección autorizada `ddce9c8` — tarjetas de aula de Programar Evaluación a 390px:
  - La regresión de U3.2 detectaba capacidad e insignia superpuestas a «Ver días libres» a 390px; explorando anchos de móvil (nueva opción `EIDA_EXAM_GUARD_WIDTHS`) el mismo defecto existía a 412 y 430px y ninguno desde 480px.
  - **Decisión técnica**: el salto de línea de la cabecera de tarjeta se aplica por debajo del corte canónico de 480px (antes, por debajo de 390px). A 390–430px cambian solo 27 elementos, todos dentro de las dos tarjetas de aula; calendario, horarios, selección de aula y barra inferior idénticos; desde 480px, idéntico. Se conservan todos los elementos y el área táctil de la tarjeta.
  - La regresión exige 0 superposiciones por debajo de 480px. `EIDA_EXAM_GUARD_FIX_BELOW=<px>` generaliza el modo de validación de correcciones.
- Validación: `hu34.ui.browser` PASS (contrato 30/30, antes 0/30, y todas las comprobaciones previas de HU34); integraciones de habilitaciones y habilitación automática con `pageLayout.test` 83/83; guardas Programar Evaluación y Editar examen 5/5 idénticas a ffbb8bc tras U3.3 y 8/8 a 320/390/412/430/480/768/1024/1440px frente a f90c9c0 tras la corrección; Node 874/875; `tsc` + build OK; lista ESLint idéntica a la base de 36; `git diff --check` OK.
- Pendiente: Programar Evaluación queda sin solapamientos conocidos a 320–1440px. U3.4 (reportes, incidencias, infracciones, expulsiones y asistencia) y U3.5 (reparto offline).
- Sin revisión humana; revisión técnica asistida por IA.

## U3.4 - Reportes, incidencias, infracciones, expulsiones y asistencia (2026-11-08)

- Rama ds/sync-arqmoc-erick, base c8c7916. Solo frontend; backend no tocado; 0 escrituras reales (fixtures HTTP de cada prueba). `Incidents.module.css` (`.page/.content/.heading`) **no se modifica**: lo usan también control de ingreso (excluido) y la administración de incidencias; cada página deja de usar esas clases en su JSX.
- Patrón: sin tarjeta envolvente (como el detalle del examen); antes, contenedor de 1280px con el padding fuera del máximo (`h1` ~32px más a la izquierda que el resto) y cabecera con márgenes de 24px arriba y abajo.
- Contrato reutilizable `src/shared/tests/pageContract.mjs` (un `main` y un `h1`, 32/40 y 24/30px bold, `section` etiquetada de 1280px, `h1` alineado con el contenido, cabecera sin tarjeta, migas exactas con 24px, cabecera 24px, acciones en la cabecera, sin desbordamiento), usado por las pruebas de navegador de cada feature.
- U3.4a — `InfractionLayout` y `ExpulsionLayout` (lista, alta y detalle de infracciones y de expulsiones):
  - Antes: `infractions.browser` 25/25 y `expulsions.browser` 30/30 FAIL en el contrato (lista, error 403 de otro examen, alta, detalle y seguimiento).
  - Ahora: `PageContainer labelledBy` + `PageHeader` con el mismo título, descripción (examen · materia o texto de reserva) y migas dinámicas; navegación del examen e hijos sin cambios.
  - Ahora PASS 25/25 y 30/30 con todas las comprobaciones funcionales previas. Las pruebas vuelven a 1440px antes de las navegaciones nuevas; el aviso de `ResizeObserver` que provocaba redimensionar la lista con el layout anterior ya no aparece.
  - Validación: `pageLayout.test` + pruebas Node de ambas features 42/42; Node 874/875; `tsc` + build OK; guardas Programar Evaluación y Editar examen 5/5 frente a c8c7916; lista ESLint idéntica a la base de 36; `git diff --check` OK.
  - Pendiente (decisión): con un identificador de examen no válido, las listas de infracciones y expulsiones muestran solo un `<p role="alert">` sin `main` ni `h1` (comportamiento previo); unificarlo añadiría título y migas.
- U3.4b — incidencias: `ExamIncidentsPage` (colaborador), `CreateIncidentPage`, `IncidentDetailPage`, `ExamIncidentConsultation` (docente y administración) y `AdminIncidentsPage` (sin examen):
  - Antes: `incidentConsultation.browser` 35/35 y `incidents.browser` 25/25 FAIL en el contrato (consulta, error 403, detalle, identificador no válido, administración sin examen/con examen/detalle; lista, error, detalle, alta e identificador no válido del colaborador).
  - **Defecto previo corregido**: la ruta administrativa `/admin/incidents/:examId/:incidentId` usa `IncidentDetailPage`, que pintaba su propio `<main>` dentro del de `AdminLayout` (main anidado, reproducido). Ahora un componente estático `PageLandmark` solo añade `<main>` fuera de `/admin/`; la consulta en modo administración no renderiza `main`.
  - Ahora: `PageContainer labelledBy` + `PageHeader` con títulos, descripciones y migas exactos; los estados de identificador no válido conservan su título y mensaje con un solo `h1`. Enlaces de acceso, filtros, tabla, exportación, formulario (borrador, confirmaciones y bloqueo de navegación) y detalle sin cambios.
  - Pruebas: bloques de contrato al final de cada prueba (sin alterar los flujos existentes); las rutas de administración de `incidentConsultation.browser` se envuelven en `main` como `AdminLayout`. `incidentConsultationView.test` comprueba que la raíz de administración es `PageContainer` y no hay `main`. `pageLayout.test` separa recuentos exactos de `main` y `PageHeader` por archivo con ramas excluyentes.
  - Incidencias: una primera ejecución de `incidents.browser` agotó la espera inicial mientras Vite reoptimizaba dependencias en frío (metadatos regenerados en ese momento); las tres ejecuciones siguientes, PASS. Un primer intento con un hook que devolvía `'div' | 'main'` introdujo 2 errores ESLint (`react-hooks/static-components`); se sustituyó por `PageLandmark` antes del commit.
  - Validación: `incidentConsultation.browser` 35/35 y `incidents.browser` 25/25 con todas sus comprobaciones funcionales; Node de incidencias + `pageLayout.test` 65/65; Node 874/875; `tsc` + build OK; guardas 5/5 frente a b34c998; lista ESLint idéntica a la base de 36; `git diff --check` OK.
- U3.4c — `ExamReportsPage` (docente: catálogo y examen; administración: catálogo) y `AttendancePage`:
  - Antes: `examReports.browser` 20/20 y `attendance.browser` 10/10 FAIL en el contrato (catálogo y examen del docente, error 403, catálogo de administración; asistencia y error 403).
  - Ahora: `PageContainer labelledBy` + `PageHeader` con títulos, descripciones y migas exactos. Reportes conserva sus dos contextos: el docente tiene su `<main>`; administración renderiza solo el `PageContainer` dentro del `main` de `AdminLayout` (sin `main` anidado; la ruta de administración de la prueba se envuelve en `main` como `AdminLayout`). Navegación del examen, catálogo, área de trabajo, filtros, actualización automática y tablas sin cambios.
  - `mainLandmarks.test` (D6) comprobaba que la raíz de administración fuera `div`; ahora es la `section` etiquetada de `PageContainer` y sigue exigiendo 0 `main` en administración y 1 en el docente.
  - Validación: `examReports.browser` 20/20 y `attendance.browser` 10/10 con todas sus comprobaciones funcionales; Node de ambas features + `pageLayout.test` 33/33; Node 874/875; `tsc` + build OK; guardas 5/5 frente a cdca260; `pageLayout.browser` completo 195/195; lista ESLint idéntica a la base de 36; `git diff --check` OK.
  - Pendiente (decisión): como en U3.4a, con un identificador no válido, reportes del docente y asistencia muestran solo un `<p role="alert">` sin `main` ni `h1`.
- Resultado de U3.4: 14 pantallas (docente, colaborador y administración) en el contrato común, sin modificar `Incidents.module.css`; 155 combinaciones de estado × ancho validadas con el contrato compartido; 1 defecto previo corregido (main anidado en el detalle de incidencia de administración).

## U3.5 - Reparto offline (2026-11-08) ✅

- Rama ds/sync-arqmoc-erick, base 1bbaf62. Solo frontend; backend no tocado; 0 escrituras (HTTP simulado, solo GET). `OfflineShared.module.css` **no se modifica** (lo usan otros 12 archivos, entre ellos las páginas offline fuera de `AppLayout`).
- Limpieza autorizada previa: 26 perfiles temporales creados hoy entre las 19:24 y las 19:50 por los scripts antiguos durante U3.4 (10 `eida-*` y 16 `hu*-browser-*`); el informe anterior decía 25 por un error de recuento (de la lista inicial de 14 `eida-*` solo existían 13). Sin procesos ni bloqueos; Chrome del usuario y Vite 5173 intactos. La migración de los scripts antiguos a `browserProfile.mjs` queda para una etapa posterior.
- `TeacherDistributionPage` (`/teacher/exams/:id/offline/assignments`):
  - Antes (reproducido con la nueva `features/offline-entry/tests/teacherDistribution.browser.mjs`, 20/20 FAIL): `h1` `clamp` de 35/26px, contenedor de 1300px, «Volver a mis exámenes» y el estado de conexión fuera de la cabecera; con identificador no válido, sin `h1`; y **defecto previo**: en la vista de lista, la miga «Distribución de listas» apuntaba a la ruta inexistente `/teacher/exams/:id/distribution`.
  - Ahora: vista principal con `PageContainer labelledBy` + `PageHeader` (mismo título, descripción y migas); «Volver a mis exámenes» y `OfflineConnectionStatus` en las acciones (en móvil, en su propia línea a todo el ancho y legibles). Vista de lista: solo el contenedor (`PageContainer` sin etiqueta) y las migas; conserva el `h1` y la sección etiquetada de `AssignedListStudentsView`. Identificador no válido: mismo patrón con un único `h1` y un único `main`. La miga apunta a `/teacher/exams/:id/offline/assignments`.
  - Sin cambios en reparto, asignaciones, conexión, preparación (diálogo), sincronización ni API.
  - `pageContract.mjs` añade `containerOnly` (vistas cuyo `h1` pertenece al contenido: se comprueba el contenedor de 1280px más cercano, migas, landmarks y desbordamiento).
- Validación: `teacherDistribution.browser` **20/20** (principal, lista seleccionada, id no válido y error a 320/390/768/1024/1440px; acciones y estado de conexión en la cabecera y visibles; destino de la miga; solo GET; sin excepciones); `offlineAssignments.test` y Node de offline + `pageLayout.test` 45/45; `indexedDb.browser` PASS; `attendance.browser` 10/10 con el helper actualizado; Node 874/875; `tsc` + build OK; guardas 5/5 frente a 1bbaf62; lista ESLint idéntica a la base de 36 (el `react-hooks/purity` de esta página es previo); `git diff --check` OK. El archivo no cumplía Prettier en HEAD: no se reformatea código ajeno.
- U3 completa (familias 1–5). Pendiente: estados de identificador no válido sin layout en 4 listas de la familia 4; control de ingreso (etapa independiente).
- Sin revisión humana; revisión técnica asistida por IA.
## D2 — Mantenimiento de perfiles temporales (2026-11-08)

- Continuación autorizada sobre `ds/sync-arqmoc-erick`, HEAD inicial `4cd80f7`; se preservaron los 6 archivos modificados y 3 nuevos de Claude. Sin cambios de aplicación, backend, contratos, dependencias ni despliegue. Control de ingreso no iniciado.
- Cambios recuperados: migración de browserHarness y scripts incidents, incidentConsultation (incluidas descargas), indexedDb e imageProxy a browserProfile; registro de perfiles y handlers SIGINT/SIGTERM/exit; regresiones de uso; barrido opt-in y reporte de retención solo lectura.
- Cierre: búsqueda Chrome y Edge con límite de argumento (evita coincidencias de prefijos), errores CIM explícitos y barrido que conserva cuando no puede inspeccionar; revalidación de token/PID/navegador antes de eliminar; carpetas de evidencia únicas para harness/incidencias; configuración imageProxy fijada al fixture local. No se ejecutaron escrituras API reales; las mutaciones funcionales de incidencias/imageProxy usan fixtures HTTP locales.
- PASS `node --test <todos los *.test.mjs de src>`: 881 PASS / 882, 0 fallos, 1 TODO previo D3. `node --test src/shared/tests/browserProfile.test.mjs src/shared/tests/browserProfileUsage.test.mjs`: 15/15 (incluye ambos handlers y guardas del barrido). Ejecución con permisos CIM; dentro del sandbox las pruebas de señal conservan el perfil al no poder inspeccionar.
- PASS browser secuencial: `indexedDb.browser`, `confirmDialogEscape.browser`, `incidents.browser` (25/25), `incidentConsultation.browser` (35/35), `imageProxy.browser`. El primer imageProxy falló con página vacía por configuración ambiental; pasa al fijar `VITE_API_URL=/backend/api/v1` y `VITE_BACKEND_URL=/backend` en el script.
- C1 y C2 verificados con Chrome real aislado: eventos Node SIGINT/SIGTERM, salida 130/143, perfil eliminado y ningún navegador usando esa ruta. Evidencia reproducible: `.validation.local/d2-maintenance-20261108/signals-real.mjs`. Límite: Windows no entrega SIGTERM como Unix; estos checks validan handlers, no señales nativas ni TerminateProcess/SIGKILL. Una terminación forzada exige barrido posterior.
- PASS `npx.cmd tsc -b`, `npm.cmd run build` (advertencia previa de bundle >500 kB). ESLint: 36 errores previos; los archivos que los producen son idénticos a HEAD normalizando CRLF. Los `.mjs` están excluidos por la configuración ESLint actual; su sintaxis/comportamiento se valida con Node, no se presenta como lint efectivo.
- Limpieza medida propia: 15.568.660 bytes / 14,85 MiB recuperados de 3 perfiles creados durante intentos restringidos; solo tras comprobar ruta, marcador, propietario muerto y ausencia de Chrome/Edge. Se detuvo únicamente el PID 9852, identificado como imageProxy bloqueado. No quedan perfiles nuevos ni Chrome/Edge QA activos; Vite 5173 (PID 10540) y Chrome del usuario conservados.
- Límite conservado: `eida-image-proxy-pK683k` previo, sin marcador, 28,3 MiB; no se borra por no poder atribuirlo con seguridad. No hay mediciones para reconstruir espacio recuperado por Claude antes de esta continuación (incluidos los 26 perfiles del checkpoint anterior).
- `validationRetention.mjs`: 135 carpetas / 780,3 MiB; 7 antiguas / 416,6 MiB. Informe solo lectura, ninguna evidencia ni respaldo eliminado. `sweepBrowserProfiles.mjs`: sin elegibles, conserva el perfil previo sin marcador; legado hu*-browser-* solo se informa.
- Logs generales en `.validation.local/d2-maintenance-20261108/`; capturas de incidencias/consulta en carpetas nuevas con UUID. Commit local único de esta etapa autorizado; sin push ni operaciones de integración.
- docs/ai/CURRENT_STATE.md actualizado localmente; está excluido por .git/info/exclude y no se fuerza su incorporación al historial.

## Control de ingreso — D1/D2 (2026-11-08)

- Rama `ds/sync-arqmoc-erick`, base `185c797`, inicio limpio. D0 revisado y D1/D2 autorizados expresamente. Alcance: `EntryControlPage.tsx`, su CSS local, nuevo `entryControlLayout.browser.mjs` y lista cerrada de consumidores en `pageLayout.test.mjs`; documentación de cierre. Sin cambios en CSS compartido ni componentes globales.
- `PageContainer` por defecto (1280px) + `PageHeader` (H1 32/24px); cabecera fuera de la superficie blanca conservada. «Control sin conexión» en actions; descripción temporal del colaborador legible. Breadcrumbs, textos, rutas y permisos intactos. El identificador inválido usa el mismo contrato visual conservando mensaje y enlace. Un solo main (AppLayout aporta div) y H1 en todas las ramas.
- CSS mínimo: ancho de la tarjeta al contenedor, fondo mediante token y gutter previo de 16px hasta 768 para conservar área operativa; sin ocultar desbordamientos globalmente. Se mantienen superficie, sombras, pestañas y estilos internos. Comparación textual con `185c797`: hooks/handlers antes del return y JSX operativo desde EntryControlExamHeader hasta los modales idénticos.
- D2 browser: `node src/features/exams/tests/entryControlLayout.browser.mjs`, 30/30 (docente y colaborador × cargado/error/id inválido × 320/390/768/1024/1440), más 10/10 mediciones QR. H1, main, migas, destinos, aviso temporal, permiso de gestión, controles y ausencia de overflow comprobados. «Ver» se revela mediante scroll horizontal de la tabla existente, abre detalle y recupera foco con Escape para ambos contextos. Pausa/reanudación, cambio Manual/QR/Verificación con el mismo nodo video y procesamiento QR contra fixture local PASS.
- Escáner real (rectángulo video), idéntico para ambos contextos; antes → después: 320 = **222×180 → 222×180** (39.960px²); 390 = **292×180 → 292×180** (52.560px²); 768 = 639×300 → 655×300; 1024 = 482,59×271,45 → idéntico; 1440 = 587,59×300 → 645,19×300. Sin reducción de ancho, alto ni área en los diez casos. El fixture usa MediaStream de canvas y BarcodeDetector controlado: no acredita cámara física ni decodificación óptica.
- Evidencia antes: `.validation.local/entry-control-layout-before-70b49293-d15f-4eff-802b-d536b1ed0087/`; después: `.validation.local/entry-control-layout-after-c65b7990-ebca-42e6-8b14-dfea3828ebdb/` (capturas + resultados.json). Comparación mediante `EIDA_ENTRY_LAYOUT_BASELINE=<antes/resultados.json>` que falla ante reducción del visor. Los datos base incumplen las nuevas comprobaciones H1/1280; no se debilitaron asserts operativos.
- Regresiones: `collaborationModal.browser` 5/5, con registro manual/confirmación ocupada/éxito, diálogos anidados, foco/Tab/Escape/scroll; `entryAnnulment.browser` PASS, con historial, cancelación, motivo/consentimiento, doble envío, errores 422/403/409/respuesta perdida y permisos. Solo transporte HTTP local simulado, 0 escrituras API reales.
- `node --test` focalizado (exámenes + anulaciones + pageLayout): 119 PASS / 120, 1 TODO D3 previo. Node completo: **881 PASS / 882, 0 fallos, 1 TODO previo**. `npx.cmd tsc -b`, `npm.cmd run build` y `git diff --check` PASS (advertencia previa bundle >500kB).
- ESLint: 36 errores = base, 0 nuevos, 0 en EntryControlPage. Comparación con `185c797` mediante ESLint sobre su fuente anterior (regla/mensaje; posiciones pueden moverse), resto de archivos con errores sin cambios. Scripts MJS no cubiertos por la configuración ESLint: ejecutados con Node. Logs y `eslint-comparison.json` en `.validation.local/entry-control-d2-20261108/`.
- Guardas Programar Evaluación y Editar examen: 5/5 cada una frente a `185c797` (250/252 elementos), capturas en `entry-control-d2-20261108/guard-{create,edit}`. Nuevas pruebas browser depuradas en la base (espera de router, fotogramas y serialización CDP); no requirieron cambios funcionales. Guarda de consumidores inicialmente FAIL, ampliada solo con EntryControlPage y sus dos ramas excluyentes.
- Cierre: 0 perfiles nuevos y 0 navegadores QA activos; perfil previo sin marcador `eida-image-proxy-pK683k` conservado, Chrome del usuario y Vite 5173 (PID 10540) intactos. Sin push. **Sin revisión humana; revisión técnica asistida por IA.** Siguiente: D0 de breadcrumbs del estudiante, sin implementar. CURRENT_STATE actualizado localmente respetando `.git/info/exclude`.

## Breadcrumbs del estudiante — D1/D2 (2026-11-08)

- Rama `ds/sync-arqmoc-erick`, base `ede747c`, inicio limpio. D0 vigente y D1/D2 autorizados. Producción: únicamente prop `breadcrumbs` añadida a PageHeader en StudentProfilePage y StudentQrPage. Inicio `/`, rutas actuales `/students/profile` y `/students/qr`; la última miga mantiene `aria-current=page` sin enlace según Breadcrumbs global.
- Sin cambios en CSS, StudentLayout, hooks, foto, pestañas, QR, permisos, rutas o estados. Se conservan titleId, descripciones, subrayado rojo y el único main del StudentLayout. Sin dependencias ni cambios compartidos de producción.
- Pruebas necesarias: nuevo `studentBreadcrumbs.test.mjs` verifica las dos rutas incluso durante carga, sin main/H1 propios; actualización de expectativas del estudiante en `pageLayout.browser.mjs`, filtro opcional `EIDA_LAYOUT_PATHS` para evitar repetir migraciones ajenas, medición vertical y navegación real Inicio/retorno mediante rutas de fixture.
- Sensibilidad: prueba Node antes FAIL (breadcrumbs undefined) → PASS; browser base `ede747c` **0/10** por ausencia de migas, después **10/10 PASS** (dos páginas × 320/390/768/1024/1440). Un main/H1, escala 32/24, subrayado, paneles y migas visibles, sin desbordamiento ni solapamiento. Inicio se activa con puntero real y las páginas se recuperan desde el inicio local de prueba.
- Espacio vertical respecto a base: H1 y contenido se desplazan **48px** en Mi perfil y **49,59375px** en Mis exámenes, igual en los cinco anchos; 24px entre migas/cabecera y cabecera/contenido. Inicio y título permanecen visibles; contenido inicial entre 253 y 304,59px en viewport de 900px. No se recortó ni comprimió contenido. Capturas revisadas a 320/390px.
- Focalizadas `node --test studentBreadcrumbs studentQrPresentation studentQrFreshness`: **18/18 PASS** (pestañas, refresco, estados vacíos, expiración/revocación/rotación, respuestas tardías y limpieza). Regresión de fotografía `imageProxy.browser`: PASS (Blob, sustitución, errores y liberación de Object URLs) con transporte local. No escrituras API reales.
- Node completo: **882 PASS / 883, 0 fallos y 1 TODO D3 previo**. `npx.cmd tsc -b`, `npm.cmd run build`, `git diff --check` PASS (advertencia previa de bundle >500kB). ESLint: **36 errores = base ede747c, 0 nuevos y 0 en ambas páginas**; comparación por regla/mensaje con ESLint sobre las fuentes previas. MJS no incluidos por configuración ESLint actual; verificados por Node.
- Guardas de Programar Evaluación y Editar examen **5/5 cada una** contra `ede747c` (250/252 elementos), sin modificar dichas pantallas. Evidencias/logs en `.validation.local/student-breadcrumbs-20261108/`: `baseline/before/result.json` y `final/after/result.json`, capturas y `eslint-comparison.json`, además de `guard-create/` y `guard-edit/`.
- Limpieza: imageProxy avisó `chrome-activo` al vencer su espera; después se comprobó propietario muerto y 0 navegadores usando su perfil marcado `eida-image-proxy-pnCjn9`, y se retiró solo ese perfil con el helper existente. No se reabrió mantenimiento ni se modificó su código; conservar aviso como limitación de cierre asíncrono. Perfil previo sin marcador conservado y evidencias intactas.
- **Sin revisión humana; revisión técnica asistida por IA.** Commit local independiente autorizado tras D2; sin push. CURRENT_STATE actualizado localmente (excluido por `.git/info/exclude`). Siguiente: D0 de auditoría de pantallas/componentes residuales, sin implementar.

## R1 — Perfiles administrativos sin main anidado (2026-11-08) ✅

- Rama ds/sync-arqmoc-erick, base d9a4dbb, inicio limpio. Solo frontend; backend no tocado; 0 escrituras (fixtures GET).
- Defecto (reproducido): `EntityProfileLayout` pintaba su área principal como `<main className={styles.mainArea}>`; sus dos consumidores (`AdminStudentDetailPage` en `/admin/students/:id` y `AdminTeacherDetailPage` en `/admin/teachers/:id`) se renderizan dentro de `AdminLayout`, que ya aporta `<main>` → dos `main` anidados.
- Corrección: el área pasa a `<section className={styles.mainArea} aria-labelledby="entity-profile-name">` y el `h1` del nombre recibe ese id estable (un perfil por página). CSS (`EntityProfileLayout.module.css`, solo clases), pestañas, barra lateral, «Regresar», estados de carga/error, datos, rutas y permisos sin cambios.
- Pruebas: `mainLandmarks.test` añade la regresión (falla antes: 1 `main`); nueva `features/users/profile/tests/adminEntityProfile.browser.mjs` (estudiante y docente dentro de un `main` como `AdminLayout`, 320–1440px: un `main`, un `h1` con el nombre que etiqueta la región, pestaña «Editar datos», «Regresar» y desbordamiento) — **0/10 antes, 10/10 después**.
- **Defecto previo conocido, no corregido (CSS fuera de R1)**: a 320px la rejilla de una columna toma el ancho mínimo de la barra lateral (`min-width: auto` y su opción más larga) y el perfil llega a 391px (estudiante) / 361px (docente). La prueba lo admite solo a 320px y solo si todo el desbordamiento queda dentro de la rejilla y no supera el borde de la barra lateral; cualquier otro desbordamiento falla. Corrección propuesta: `min-width: 0` en `.sidebar` (requiere autorización sobre el CSS).
- Validación: focalizadas (frontendBatch, cssContracts, mainLandmarks, users/students/teachers) 194/194; `historicalPhoto.browser` PASS; guardas Programar Evaluación y Editar examen 5/5 frente a d9a4dbb; Node 883/884 (0 fallos, 1 `todo` de D3); `tsc` + build OK; lista ESLint idéntica a la base de 36; `git diff --check` OK; 0 Chrome headless restantes.
- Sin revisión humana; revisión técnica asistida por IA.

## R1b — Desbordamiento a 320px de los perfiles administrativos (2026-11-08) ⏸ detenido

- Autorizado probar `min-width: 0` en `.sidebar` (`EntityProfileLayout.module.css`). Reproducido con la prueba endurecida (sin excepción a 320px y con comprobación de recorte/solape de las opciones de la barra lateral): estudiante y docente FAIL a 320px.
- `min-width: 0` en `.sidebar` **no corrige**: por debajo de 900px la rejilla usa `1fr` (= `minmax(auto, 1fr)`), cuyo mínimo es el contenido mínimo de la barra lateral **y** del área del perfil. Probado además `grid-template-columns: minmax(0, 1fr)` en ese `@media` (equivalente a la pista de escritorio): docente 5/5 PASS, pero el estudiante sigue desbordando 2px por la cabecera del perfil (padding 32px, avatar fijo de 96px y separación de 24px dejan ~64px para nombre e insignias).
- Detenido según la autorización (requiere rediseñar la cabecera del perfil en móvil). Ningún cambio confirmado; trabajo conservado en el scratchpad de la sesión (`r1b/`). Alternativas presentadas al usuario.

## R2 — Identificadores de examen no válidos (2026-11-08) ✅

- Rama ds/sync-arqmoc-erick, base 238f5ec. Solo frontend; backend no tocado; 0 escrituras (fixtures).
- Antes (reproducido): las 8 ramas de identificador no válido pintaban solo `<p role="alert">` en rutas docentes bajo `AppLayout` (sin `main` propio): página sin `main` ni `h1`. Infracciones y expulsiones 15/15 FAIL cada una («sin h1, 0 main»); asistencia y reportes no encontraban el `h1`.
- Nuevo `features/exams/components/InvalidExamPage.tsx`: un `main` con `PageContainer labelledBy` + `PageHeader` (título de la pantalla) y el mensaje exacto con `role="alert"`; sin migas y sin navegación del examen (no hay examen válido al que enlazar).
- Aplicado solo a las 8 ramas: lista, alta y detalle de infracciones y de expulsiones, asistencia y reportes del docente, con su título y mensaje exactos. Sin cambios de lógica, rutas, permisos ni API; los layouts del examen no se reutilizan.
- `pageContract.mjs` añade `alertText` (texto exacto de la alerta dentro del `main`). Las pruebas de infracciones, expulsiones, asistencia y reportes añaden los 8 estados.
- Validación: estados no válidos **40/40** (8 × 320/390/768/1024/1440) y todos los estados previos de contrato (125 en total) con sus flujos funcionales; `pageLayout.test` + `mainLandmarks` + Node de las 4 features 70/70; Node 883/884; `tsc` + build OK; guardas Programar Evaluación y Editar examen 5/5 frente a 238f5ec; lista ESLint idéntica a la base de 36; `git diff --check` OK.
- Sin revisión humana; revisión técnica asistida por IA.
