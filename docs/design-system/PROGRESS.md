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
| DS2.2d | Materias e importación CSV (Aulas y Materias juntas) con `Button`/`Field` | 🔄 | Erick | Botones de Materias y Periodos ✅ `b750e55` (32 `Button` y 1 `ButtonLink`; mismas excepciones que Aulas). Pendientes: `Field`/controles, acciones de fila, cerrar × e importación CSV compartida. Sin revisión humana; revisión técnica asistida por IA |

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
| collaborations | Bajo | DS3 | ⏳ | Pendiente | 4 modales |
| eligibilities / eligibility-automation | Medio | DS3 | ⏳ | Pendiente | 4 tablas |
| admin | Alto | DS4 | ⏳ | Pendiente | 330 colores literales; `EntityProfileLayout` duplicado; 22 clases de botón |
| students | Alto | DS4 | 🔄 (DS4.1a ✅ `54988fb`) | Erick | Docente: alumnos de la materia e importación migrados. Pendientes: `StudentProfilePage`, `StudentQrPage`, modales y panel CSV compartido; QR |
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

## DS4.1 - Pantallas docentes de estudiantes y botones DS2.2d (2026-11-07)

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
  - Backend real: pendiente; requiere sesión docente iniciada manualmente.
- Sin revisión humana; revisión técnica asistida por IA.
