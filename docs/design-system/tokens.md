# Tokens

Fuente: [`src/assets/styles/tokens.css`](../../src/assets/styles/tokens.css), importado
desde `global.css` (verificado en DS1.4a, sobre `52f80a5`). Esta página distingue:

- ✅ **Existente:** definido hoy en `tokens.css`; se puede usar.
- 🕒 **Aprobado, pendiente de implementar:** valores aceptados, pero todavía no existen en el código. **No usar.**

Regla: consumir siempre los tokens semánticos `--color-*`, no la paleta `--brand-*`
(el propio `tokens.css` lo indica: "Components should consume semantic tokens").
Los contratos de `src/shared/tests/cssContracts.test.mjs` comprueban los valores de esta página.

## ✅ Paleta de marca (`:root` — Semi-Flat)

| Token | Valor |
|---|---|
| `--text-primary` / `--brand-navy` | `#172554` / `var(--text-primary)` |
| `--text-secondary` | `#68778f` |
| `--bg-primary` / `--brand-blue-light` | `#eaf3ff` / `var(--bg-primary)` |
| `--bg-secondary` / `--brand-azure-mist` | `#dff1ff` / `var(--bg-secondary)` |
| `--bg-tertiary` / `--brand-white-warm` | `#f9fcff` / `var(--bg-tertiary)` |
| `--btn-primary` / `--brand-blue` / `--brand-cobalt` | `#2563eb` / `var(--btn-primary)` |
| `--btn-secondary` / `--brand-crimson` | `#8b1e3f` / `var(--btn-secondary)` |
| `--btn-secondary-accent` / `--brand-pink` | `#d67a8c` / `var(--btn-secondary-accent)` |
| `--btn-secondary-soft` / `--brand-pink-light` | `#f7e9ed` / `var(--btn-secondary-soft)` |
| `--destructive` / `--destructive-soft` | `#d32f2f` / `#fcd2d2` |
| `--success` / `--success-soft` | `#2e7d32` / `#c2f2c4` |
| `--warning` / `--warning-soft` | `#ffc107` / `#fff1c8` |

## ✅ Tipografía

| Token | Valor |
|---|---|
| `--font-family` / `--font-family-base` | `'Poppins', system-ui, …` |
| `--type-h1` · `--type-h2` · `--type-h3` | `800 2.5rem/2.5rem` · `600 1.5rem/1.875rem` · `600 1.25rem/1.5625rem var(--font-family)` |
| `--type-body` · `--type-small` · `--type-interactive` | `400 1rem/1.5rem` · `400 0.875rem/1.3125rem` · `600 0.875rem/1rem var(--font-family)` |
| `--font-size-xs` · `sm` · `md` · `lg` · `xl` · `2xl` · `3xl` · `4xl` | `0.875` · `0.875` · `1` · `1` · `1.25` · `1.5` · `2.5` · `2.5rem` |
| `--font-weight-regular` · `semibold` · `extrabold` | `400` · `600` · `800` (alias deprecados: `medium` = `400`, `bold` = `600`) |
| `--line-height-tight` · `normal` · `relaxed` | `1.25` · `1.5` · `1.5` |

## ✅ Espaciado, radios y layout

| Token | Valor |
|---|---|
| `--space-1` · `2` · `3` · `4` · `5` · `6` · `8` · `10` · `12` · `16` | `4` · `8` · `12` · `16` · `20` · `24` · `32` · `40` · `48` · `64px` |
| `--radius-sm` · `md` · `lg` · `xl` · `pill` | `4` · `8` · `16` · `20px` · `9999px` |
| `--button-height` / `--input-height` | `44px` |
| `--button-radius` / `--input-radius` | `var(--radius-sm)` |
| `--content-max-width` | `1300px` |
| `--content-gutter` | `var(--space-4)`; `--space-6` desde 640px; `--space-8` desde 1024px |
| `--header-height` / `--app-header-height` · `--footer-height` | `7rem` · `3rem` |
| `--transition-fast` · `--transition-normal` | `150ms ease` · `250ms ease` |
| `--focus-width` · `--focus-offset` | `2px` · `2px` |

## ✅ Color semántico (tema claro: `:root, [data-theme='light']`)

| Grupo | Tokens (valor en tema claro) |
|---|---|
| Primario | `--color-primary` (`--btn-primary`), `--color-primary-hover`, `--color-primary-active`, `--color-primary-deep`, `--color-on-primary` `#ffffff` |
| Acento | `--color-accent` (`--btn-secondary`), `--color-accent-hover` / `--color-accent-strong`, `--color-accent-soft` (`--btn-secondary-soft`), `--color-on-accent` `#ffffff`, `--color-decorative` (`--btn-secondary-accent`) |
| Superficies | `--color-background` (`--bg-primary`), `--color-surface` (`--bg-tertiary`), `--color-surface-soft` (`--bg-secondary`), `--color-surface-muted` (`--bg-primary`), `--color-surface-accent` (`--btn-secondary-soft`) |
| Texto | `--color-text` / `--color-text-primary` (`--text-primary`), `--color-text-secondary` / `--color-text-muted` (`--text-secondary`) |
| Bordes | `--color-border` `rgb(104 119 143 / 25%)`, `--color-border-soft` `rgb(104 119 143 / 15%)`, `--color-border-strong` `rgb(104 119 143 / 40%)`, `--color-input-border` (`--text-secondary`) |
| Deshabilitado | `--color-disabled-background` (`--bg-secondary`), `--color-disabled-text` (`--text-secondary`) |
| Estado | `--color-success` (`--success`) / `-soft` (`--success-soft`); `--color-warning` (`--warning`) / `-soft` (`--warning-soft`); `--color-error` (`--destructive`) / `-soft` (`--destructive-soft`); `--color-info` (`--btn-primary`) / `-soft` (`--bg-secondary`) |
| Otros | `--color-footer`, `--color-footer-deep`, `--color-soft-red`, `--color-soft-blue`, `--color-soft-cyan`, `--color-cobalt-blue`, `--color-azure-mist` |
| Foco y selección | `--color-focus` (`--btn-secondary`), `--color-selection-background` (`--btn-secondary`), `--color-selection-text` `#ffffff` |
| Sombras | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-lg-hover`, `--shadow-soft-rgb`, `--shadow-card-rgb` (`104 119 143`) |

### Uso actual en badges de estado

`AdminStatusBadge` ([`adminStatusBadge.module.css`](../../src/features/portal-shared/adminStatusBadge.module.css)) mapea hoy:

| Estado | Fondo / texto | Contraste (tema claro) |
|---|---|---|
| Por defecto (Inactivo, Despublicado, Archivado) | `--color-surface-soft` / `--color-text-secondary` | ≥ 4,5 |
| PUBLISHED, ACTIVE | `--color-info-soft` / `--color-primary` | ≥ 4,5 |
| DRAFT | `--color-warning-soft` (borde `--color-warning`) / `--color-text` | ≥ 7,0 |
| PENDING_CHANGES | `--color-accent-soft` / `--color-accent` | ≥ 7,0 |
| CANCELLED | `--color-error-soft` / `--color-error` | ≥ 4,5 |

## ✅ Tema oscuro: definido, **no activado**

`[data-theme='dark']` redefine los `--color-*` y las sombras, pero ningún código
aplica `data-theme` hoy. Riesgo conocido si se activara: los tokens `--brand-*`
no se redefinen, y combinaciones como `--brand-blue-light` + `--color-primary`
(Publicado/Activo) bajan a un contraste de 2,27.

**Decisión aprobada:** conservar los tokens del tema oscuro tal como están y **no
activarlo**. Si en el futuro se decide activarlo, será una etapa propia que corrija
antes esos usos de `--brand-*`.

## ✅ Tokens semánticos de estado y controles (DS1.4a)

Definidos **a partir de tokens existentes**. Aún no tienen consumidores: se adoptarán al
crear las primitivas de DS2 (p. ej. `Badge`) y al migrar cada módulo.

| Token | Valor | Contraste (claro · oscuro) |
|---|---|---|
| `--status-neutral-bg` / `-fg` | `var(--color-surface-soft)` / `var(--color-text-secondary)` | 5,54 · 7,50 |
| `--status-info-bg` / `-fg` | `var(--color-info-soft)` / `var(--color-primary)` | 6,83 · 5,73 |
| `--status-success-bg` / `-fg` | `var(--color-success-soft)` / `var(--color-success)` | 4,57 · 9,78 |
| `--status-warning-bg` / `-fg` | `var(--color-warning-soft)` / `var(--color-warning)` | 4,51 (en el límite AA) · 9,64 |
| `--status-danger-bg` / `-fg` | `var(--color-error-soft)` / `var(--color-error)` | 5,30 · 7,71 |
| `--control-height` | `var(--button-height)` (44px) | — |
| `--control-height-sm` | `36px` | — |

- Los `--status-*` se declaran en el bloque del tema claro (`:root, [data-theme='light']`); los `--control-height*`, en `:root`.
- **`--control-height-sm` (36px)** se reserva para controles compactos secundarios (p. ej. acciones de barra de herramientas en escritorio). **No sustituye** el tamaño táctil recomendado de 44px (`--control-height`): los controles principales y los de pantallas táctiles usan 44px.
- Consumidor de `--control-height` y `--control-height-sm`: `Button` (DS2.2a), autorizado en el contrato de `cssContracts.test.mjs`.
- El estado nunca se comunica solo con color ([rules.md](rules.md) §6): los badges llevan siempre texto.
- Tema oscuro (no activado): un token con `var()` se resuelve en el elemento donde se declara. Como los `--status-*` están en `:root`, solo seguirían al tema oscuro si `data-theme` se aplica en `<html>`; aplicarlo en un descendiente heredaría los valores claros. A tener en cuenta en la etapa que active el tema oscuro.

## ✅ Escala de `z-index` (DS1.4b)

Declarada en `:root`. Todavía sin consumidores: los componentes siguen con sus valores literales.

| Token | Valor | Uso |
|---|---|---|
| `--z-sticky` | `50` | Cabecera sticky (valor actual de `.header`) |
| `--z-dropdown` | `60` | Menús desplegables (valor actual de los desplegables de la cabecera) |
| `--z-dialog` | `1000` | Overlays de modal no nativos |
| `--z-toast` | `1100` | Notificaciones temporales |

- **Declarar la escala no resuelve los conflictos de apilamiento actuales.** Hoy hay valores
  sueltos (1, 2, 20, 30, 50, 60, 100, 200, 1000) y siguen pendientes:
  - `.snackbar` (20) queda por debajo de todos los overlays de modal (30–1000);
  - el overlay de pantalla completa de `AddStudentsModal.module.css` (30, lo usa `CollaborationModal`) queda por debajo de la cabecera (50); los diálogos de estudiantes ya no lo usan (DS4.2b);
  - `customOptionsList` de `EntityProfileLayout` (50) empata con la cabecera.
- La migración de consumidores a `var(--z-*)` se hace al migrar cada componente o módulo
  (DS2–DS4), en su propia subetapa y con validación browser.
- Los `<dialog>` nativos (`PortalDialog`, `ConfirmDialog` en modo `native` y los modales
  con `showModal()`) se muestran en la *top layer* del navegador, que **no se ordena con
  `z-index`**: ningún `--z-*` coloca un elemento por encima de ellos. Comprobado en Chrome
  (DS4.2b): con un `<dialog>` modal abierto nada fuera de él es operable, ni siquiera un
  *popover* de la top layer, se abra antes o después; solo lo es lo que está dentro del diálogo.
  Por eso el Snackbar queda, a propósito, bajo el fondo del modal y vuelve a ser usable al cerrarlo.
- Los valores locales `1` y `2` (orden dentro de un mismo componente) no forman parte de la escala.

## Breakpoints

- **Hoy:** no hay tokens de breakpoint (CSS Modules no admite custom media sin un
  plugin). El código usa 21 valores distintos; los más frecuentes son 640, 768, 600 y 480px.
- **Canónicos aprobados:** `480px`, `640px`, `768px`, `1024px`. Se adoptan en el código nuevo y en cada módulo al migrarlo; el código no migrado conserva sus valores actuales.
  Se documentan aquí y se usarían literalmente en `@media`; los contratos CSS podrán
  comprobar que los archivos migrados solo usan estos valores.
- **Anchos de validación:** 320, 390, 768 y 1440px (ver [validation.md](validation.md)).
