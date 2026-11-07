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
| DS2.2d | Materias e importación CSV (Aulas y Materias juntas) con `Button`/`Field` | ⏳ | Pendiente | — |

## Matriz por módulo (DS3–DS4)

"Alineado F1–F2" significa que ya comparte contenedor, textos y badges del portal; **no** que esté migrado a `ui/`.

| Módulo | Riesgo | Etapa | Estado | Responsable | Notas DS0 |
|---|---|---|---|---|---|
| portal-news | Bajo | DS3 | ⏳ (alineado F1–F2) | Pendiente | |
| portal-information | Bajo | DS3 | ⏳ (alineado F1–F2) | Pendiente | |
| portal-services | Bajo | DS3 | ⏳ (alineado F1–F2) | Pendiente | |
| portal-calendar | Bajo | DS3 | ⏳ (alineado F1–F2) | Pendiente | |
| portal-shared | Bajo | DS3 | ⏳ | Pendiente | Base de `ui/` (AdminStatusBadge, PortalUi) |
| academic-terms | Bajo | DS3 | ⏳ | Pendiente | 3 modales, tabla y paginación propias |
| rooms | Bajo | DS3 | ⏳ | Pendiente | 3 modales, 2 tablas |
| subjects | Bajo | DS3 | ⏳ | Pendiente | 3 modales, 2 tablas |
| course-offerings | Bajo | DS3 | ⏳ | Pendiente | 3 paginaciones propias |
| collaborations | Bajo | DS3 | ⏳ | Pendiente | 4 modales |
| eligibilities / eligibility-automation | Medio | DS3 | ⏳ | Pendiente | 4 tablas |
| admin | Alto | DS4 | ⏳ | Pendiente | 330 colores literales; `EntityProfileLayout` duplicado; 22 clases de botón |
| students | Alto | DS4 | ⏳ | Pendiente | 56 colores literales; importación y QR |
| exams | Alto | DS4 | ⏳ | Pendiente | Control de ingreso en vivo: validación manual |
| home | Medio | DS4 | ⏳ | Pendiente | 59 `font-size` en px |
| shared/components (Header, DataTable, DataCardGrid) | Alto | DS4 | ⏳ | Pendiente | Unos 217 literales; usados por muchas features |
| layouts | Bajo | DS4 | ⏳ | Pendiente | |
| auth, health, infractions, reports, entries, eligibility, collaborators | — | Por auditar | ⏳ | Pendiente | Sin CSS propio significativo en DS0 |

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
