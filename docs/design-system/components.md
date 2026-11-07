# Componentes

Antes de crear un componente o estilo, buscar aquí (o con `grep`) un equivalente.
Si existe uno parecido, extenderlo mediante props en una PR revisada en lugar de
copiarlo. Inventario verificado en `f3cf6f5`; ubicación de las clases globales actualizada en DS1.3 (`52f80a5`).

## ✅ Existentes y reutilizables

### `src/shared/components`

| Componente | Ruta | Propósito |
|---|---|---|
| `DataTable` (+ `DataTableRow`, tipos en `dataTable.types.ts`) | `shared/components/DataTable/` | Tabla con búsqueda (incluye su botón "Limpiar"), filtros (`filters`, `filterLayout: 'below' \| 'inline'`), estados de carga, error y vacío, paginación y vista de tarjeta en móvil |
| `PortalDialog` | `shared/components/PortalDialog/` | Modal o Drawer (`drawer`) sobre `<dialog>` nativo: foco inicial, bloqueo de scroll, `footer` fuera del cuerpo, Escape gestionado en `keydown` y reapertura ante cierres nativos inesperados |
| `ConfirmDialog` | `shared/components/ConfirmDialog/` | Confirmación. Modo `native` para confirmar sobre un Drawer (Escape robusto, `loading`); modo overlay heredado. `features/admin/components/ConfirmDialog` solo lo reexporta |
| `Breadcrumbs` | `shared/components/Breadcrumbs/` | Miga de pan (`BreadcrumbItem[]`) |
| `Header` (+ `headerNavigation.config.ts`) | `shared/components/Header/` | Cabecera y navegación por rol |
| `Footer` | `shared/components/Footer/` | Pie de página |
| `DataCardGrid` (+ `DataCardItem`) | `shared/components/DataCardGrid/` | Rejilla de tarjetas con campos y acciones según el rol |
| `AuthenticatedImage` | `shared/components/AuthenticatedImage/` | Imagen que requiere sesión (usa `useAuthenticatedImage`) |
| `Snackbar` | `shared/components/Snackbar.tsx` | Notificación temporal (clases `.snackbar*` de `assets/styles/snackbar.css`) |

### `src/shared/components/ui` (primitivas del Design System, DS2)

| Componente | Ruta | API |
|---|---|---|
| `PageContainer` | `ui/PageContainer/` | `children`, `width?: 'default' \| 'narrow'` (1280px = `--content-max-width` / 960px), `className?`, `labelledBy?` (renderiza `<section aria-labelledby>`; sin él, `<div>`). Padding `--space-8` / `--content-gutter` (`--space-5` vertical ≤640px). **Nunca renderiza `<main>`** (lo aportan los layouts) y no es una tarjeta: sin fondo, borde ni sombra |
| `PageHeader` | `ui/PageHeader/` | `title` (obligatorio, no vacío; único `<h1>`), `titleId?`, `focusableTitle?` (`tabIndex={-1}` para la gestión de foco existente), `eyebrow?`, `description?` (contenido en línea, va dentro de un `<p>`), `breadcrumbs?: BreadcrumbItem[]` (reutiliza `Breadcrumbs`), `actions?` (se renderizan tal cual). `h1` `--font-size-3xl` (`2xl` ≤640px), bold; descripción `md` (`sm` ≤640px); separación inferior `--space-6`; acciones a la derecha y apiladas ≤640px |
| `Button` | `ui/Button/` | `variant?: 'primary' \| 'secondary' \| 'danger' \| 'ghost'` (por defecto `primary`), `size?: 'md' \| 'sm'` (44px `--control-height` / 36px `--control-height-sm`, solo acciones secundarias de escritorio), `loading?` (añade `disabled` y `aria-busy`; el texto lo pone el consumidor), `type="button"` por defecto y props nativas (incluido `ref`). No impone nombre accesible: un botón solo con icono necesita `aria-label`. Deshabilitado con `--color-disabled-*` y `opacity: 1` (anula el 0.65 global de `base.css`) |
| `ButtonLink` | `ui/Button/` | `Link` de `react-router` con el aspecto de `Button` (`variant`, `size`); siempre renderiza `<a>`; sin `disabled` ni `loading` |
| `Field` | `ui/Field/` | `label`, `htmlFor?` (si falta, `useId`), `required?`, `hint?`, `error?`, `className?` y `children` como función que recibe `{ id, required, aria-invalid, aria-describedby }`. Enlaza ayuda (`<id>-hint`) y error (`<id>-error`) por `aria-describedby`; el error marca `aria-invalid` y **no** es región viva (sin `role="alert"`): los avisos generales van en un resumen del formulario. `*` visual con `aria-hidden` |
| `TextInput`, `Select`, `Textarea` | `ui/Field/` | Elementos nativos (props nativas y `ref`; `Select` con `<option>`/`<optgroup>` nativos; `Textarea` con `resize: vertical`) más `invalid?`. Estilos compartidos en `controls.module.css` con `--input-height`, `--input-radius` y `--color-input-border`; foco, hover, inválido y deshabilitado con tokens |

Pruebas de `Button`: `ui/tests/button.test.mjs` (SSR y CSS) y `ui/tests/button.browser.mjs` (catálogo aislado: contraste AA, foco con teclado, 4 anchos).
Pruebas de los campos: `ui/tests/field.test.mjs` (SSR y CSS) y `ui/tests/field.browser.mjs` (label↔control, `aria-describedby`, teclado, `select` nativo, contraste, 4 anchos).
Pruebas: `ui/tests/pageLayout.test.mjs` (SSR, CSS y lista cerrada de consumidores autorizados) y
`ui/tests/pageLayout.browser.mjs` (navegador con transporte simulado: Importar aulas/materias, Gestión de
aulas/materias, Carreras, Auditoría y Noticias, Servicios e Información (admin y pública) a 320/390/768/1440px; solo renderizado y layout, sin importar ni guardar).
Consumidores (DS2.1b–g): Importar aulas/materias, Gestión de aulas/materias, Carreras
(`AdminReadPage`, solo la variante `careers`; Auditoría conserva su cabecera) y Criterios de
habilitación, Gestión de noticias, servicios e información (vía `PortalAdminCollection headerVariant="page"`)
y las páginas públicas de Noticias, Servicios e Información (cada una aporta su propio `<main>`;
`NewsDetailPage` y `ServiceDetailPage` sin migrar). Las acciones de cabecera existentes se pasan tal cual en `actions` (p. ej. dentro de
su `.headerActions` original).

### `src/features/portal-shared` (portal administrativo)

| Componente | Propósito |
|---|---|
| `PortalAdminCollection` | Página de listado administrativo: cabecera (título, descripción, botón de crear; `headerVariant?: 'legacy' \| 'page'`, por defecto `legacy`; `page` usa `PageHeader` dentro del mismo `.page`, hoy Noticias, Servicios e Información), DataTable, búsqueda, `filters`, `resetPageKey` y recarga tras guardar sin perder filas (`aria-busy`) |
| `AdminStatusBadge` | Badge de estado de solo presentación (`status` ∈ PUBLISHED, DRAFT, UNPUBLISHED, ARCHIVED, ACTIVE, INACTIVE, PENDING_CHANGES, CANCELLED; `children` sustituye la etiqueta) |
| `PortalUi` | `PortalModal` (adaptador de PortalDialog), `PortalPageLayout`, `PortalFeedback`, `PortalPager`, `EditorFeedback`, `PortalField`, `ContentLink` |
| `PortalHistory` / `PortalHistoryPanel` | Historial de cambios bajo demanda |
| `usePortalResource`, `useRevisionEditor` | Carga con cancelación y edición con control de revisión |

### Hooks, utilidades y estilos

| Elemento | Ruta | Propósito |
|---|---|---|
| `useBodyScrollLock` | `shared/hooks/` | Bloquea el scroll del `body` mientras un diálogo está abierto |
| `useAuthenticatedImage` | `shared/hooks/` | Carga de imágenes con sesión y liberación de Object URLs |
| `trapDialogFocus` | `shared/utils/` | Retención de Tab dentro de un diálogo no nativo |
| `portalBase.module.css` | `shared/styles/` | Base del portal: `.page`, `.dialog`, `.field`, `.toolbar`, `.actions`, `.notice`, `.error`, `.muted`, `.filters` |
| `CsvImport*.module.css` | `shared/styles/` | Estilos de importación CSV |
| `.primary-button`, `.secondary-button`, `.auth-*` | `assets/styles/auth.css` | Clases globales heredadas del login (`.secondary-button` hoy sin uso). No crear clases globales nuevas |
| `.snackbar*` | `assets/styles/snackbar.css` | Clases globales del `Snackbar` compartido |
| `.backend-status`, `.session-loading` | `assets/styles/shell.css` | Estado del backend y carga de sesión (`.app-shell` hoy sin uso) |

## ⚠️ Componentes locales que duplican patrones (no copiar; migrar en DS3–DS4)

Medido en DS0:

- **Modales y diálogos propios:** 18 `*Modal` y 13 `*Dialog` en features. 6 usan `<dialog>` nativo, 8 un overlay con Escape gestionado a mano y 7 PortalDialog o derivados.
- **Tablas:** 16 implementaciones con `<table>` propio frente a 9 consumidores de DataTable.
- **Paginación:** reimplementada en unos 18 archivos.
- **Botones:** 64 clases distintas (`.primaryButton`, `.secondaryButton`, `.cancelButton`…) en 28 archivos CSS.
- **Badges de dominio:** `AcademicTermStatusBadge`, `EntryConditionBadge`, `AcademicResultBadge`, `ProfileActiveTermBadge`.
- **Duplicado literal:** `EntityProfileLayout` existe en `features/admin/components/` y en `features/admin/profile/components/`.

## 🕒 Planificados en `src/shared/components/ui/` (ubicación aprobada; aún no existen, se crean a lo largo de DS2)

| Componente | Base existente | Notas de API (borrador) |
|---|---|---|
| `IconButton` | Botones de icono (p. ej. cerrar ×) | Pendiente de decisión. Mientras tanto: `Button variant="ghost"` con `aria-label` |
| `Badge` | `AdminStatusBadge` | `tone`: neutral, info, success, warning, danger. `AdminStatusBadge` pasaría a ser un mapeo de estados sobre `Badge`, sin cambiar su API |
| `Pagination` | Paginación interna de DataTable y `PortalPager` | Extraída sin cambiar la API de DataTable |
| `EmptyState`, `LoadingState`, `Notice` | Estados de DataTable y `PortalFeedback` | |
| `Dialog` | `PortalDialog` y `ConfirmDialog` nativo | Una sola familia; conservar el Escape robusto |

Regla: un componente planificado no se usa hasta que exista en el código y esta
tabla lo mueva a "Existentes".
