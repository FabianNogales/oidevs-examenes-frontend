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

### `src/features/portal-shared` (portal administrativo)

| Componente | Propósito |
|---|---|
| `PortalAdminCollection` | Página de listado administrativo: cabecera (título, descripción, botón de crear), DataTable, búsqueda, `filters`, `resetPageKey` y recarga tras guardar sin perder filas (`aria-busy`) |
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

## 🕒 Planificados en `src/shared/components/ui/` (ubicación aprobada; no existen todavía, se crean en DS2)

| Componente | Base existente | Notas de API (borrador) |
|---|---|---|
| `Button`, `IconButton` | Las 64 clases de botón | `variant`: primary, secondary, ghost, danger; `size`: md, sm; `loading` |
| `Field`, `TextInput`, `Select`, `Textarea` | `PortalField`, `AuthField`, `RoomFormField` | Etiqueta, error y ayuda con `aria-invalid` y `aria-describedby` |
| `Badge` | `AdminStatusBadge` | `tone`: neutral, info, success, warning, danger. `AdminStatusBadge` pasaría a ser un mapeo de estados sobre `Badge`, sin cambiar su API |
| `Pagination` | Paginación interna de DataTable y `PortalPager` | Extraída sin cambiar la API de DataTable |
| `EmptyState`, `LoadingState`, `Notice` | Estados de DataTable y `PortalFeedback` | |
| `Dialog` | `PortalDialog` y `ConfirmDialog` nativo | Una sola familia; conservar el Escape robusto |
| `PageHeader`, `PageContainer` | Cabecera de `PortalAdminCollection` (1280px, título, descripción, acción) | |

Regla: un componente planificado no se usa hasta que exista en el código y esta
tabla lo mueva a "Existentes".
