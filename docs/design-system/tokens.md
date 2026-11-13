# Tokens

Fuente: [`src/assets/styles/tokens.css`](../../src/assets/styles/tokens.css), importado
desde `global.css` (verificado en DS1.4a, sobre `52f80a5`). Esta página distingue:

- ✅ **Existente:** definido hoy en `tokens.css`; se puede usar.
- 🕒 **Aprobado, pendiente de implementar:** valores aceptados, pero todavía no existen en el código. **No usar.**

Regla: consumir siempre los tokens semánticos `--color-*`, no la paleta `--brand-*`
(el propio `tokens.css` lo indica: "Components should consume semantic tokens").
Los contratos de `src/shared/tests/cssContracts.test.mjs` comprueban los valores de esta página.

## ✅ Paleta de marca (`:root`)

| Token | Valor |
|---|---|
| `--brand-navy` | `#172554` |
| `--brand-blue` | `#2563eb` |
| `--brand-cobalt` | `#0049a8` |
| `--brand-crimson` | `#8b1e3f` |
| `--brand-pink` | `#d67a8c` |
| `--brand-pink-light` | `#f7e9ed` |
| `--brand-blue-light` | `#eaf3ff` |
| `--brand-azure-mist` | `#e9f9f6` |
| `--brand-white-warm` | `#fafafa` |

## ✅ Tipografía

| Token | Valor |
|---|---|
| `--font-family` / `--font-family-base` | `'Poppins', system-ui, …` |
| `--font-size-xs` · `sm` · `md` · `lg` · `xl` · `2xl` · `3xl` · `4xl` | `0.75` · `0.875` · `1` · `1.125` · `1.25` · `1.5` · `2` · `2.5rem` |
| `--font-weight-regular` · `medium` · `semibold` · `bold` | `400` · `500` · `600` · `700` |
| `--line-height-tight` · `normal` · `relaxed` | `1.25` · `1.5` · `1.6` |

## ✅ Espaciado, radios y layout

| Token | Valor |
|---|---|
| `--space-1` · `2` · `3` · `4` · `5` · `6` · `8` · `10` · `12` · `16` | `4` · `8` · `12` · `16` · `20` · `24` · `32` · `40` · `48` · `64px` |
| `--radius-sm` · `md` · `lg` · `xl` · `pill` | `6` · `10` · `16` · `20px` · `9999px` |
| `--button-height` / `--input-height` | `44px` |
| `--button-radius` / `--input-radius` | `var(--radius-md)` |
| `--content-max-width` | `1280px` |
| `--content-gutter` | `var(--space-4)`; `--space-6` desde 640px; `--space-8` desde 1024px |
| `--header-height` / `--app-header-height` · `--footer-height` | `7rem` · `3rem` |
| `--transition-fast` · `--transition-normal` | `150ms ease` · `250ms ease` |
| `--focus-width` · `--focus-offset` | `3px` · `4px` |

## ✅ Color semántico (tema claro: `:root, [data-theme='light']`)

| Grupo | Tokens (valor en tema claro) |
|---|---|
| Primario | `--color-primary` (`--brand-cobalt`), `--color-primary-hover` `#1d4ed8`, `--color-primary-active` `#1e40af`, `--color-primary-deep` `#002f7a`, `--color-on-primary` `#ffffff` |
| Acento | `--color-accent` `#d9153b`, `--color-accent-hover` / `--color-accent-strong` `#c40f35`, `--color-accent-soft` (`--brand-pink-light`), `--color-on-accent` `#ffffff`, `--color-decorative` (`--brand-pink`) |
| Superficies | `--color-background` (`--brand-blue-light`), `--color-surface` `#ffffff`, `--color-surface-soft` (`--brand-blue-light`), `--color-surface-muted` `#f5fbff`, `--color-surface-accent` (`--brand-pink-light`) |
| Texto | `--color-text` (`--brand-navy`), `--color-text-primary` `#062772`, `--color-text-secondary` `#52627a`, `--color-text-muted` `#5b6a80` |
| Bordes | `--color-border` `#dce5f2`, `--color-border-soft` `#dce8ff`, `--color-border-strong` `#b8c9e1`, `--color-input-border` (`--color-text-muted`) |
| Deshabilitado | `--color-disabled-background` (`--color-surface-soft`), `--color-disabled-text` (`--color-text-secondary`) |
| Estado | `--color-success` `#15803d` / `-soft` `#dcfce7`; `--color-warning` `#b45309` / `-soft` `#fef3c7`; `--color-error` `#b91c1c` / `-soft` `#fee2e2`; `--color-info` (`--color-primary-hover`) / `-soft` `#dbeafe` |
| Otros | `--color-footer`, `--color-footer-deep`, `--color-soft-red`, `--color-soft-blue`, `--color-soft-cyan`, `--color-cobalt-blue`, `--color-azure-mist` |
| Foco y selección | `--color-focus` (`--color-primary`), `--color-selection-background`, `--color-selection-text` |
| Sombras | `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-soft-rgb`, `--shadow-card-rgb` |

### Uso actual en badges de estado

`AdminStatusBadge` ([`adminStatusBadge.module.css`](../../src/features/portal-shared/adminStatusBadge.module.css)) mapea hoy:

| Estado | Fondo / texto | Contraste (tema claro) |
|---|---|---|
| Por defecto (Inactivo, Despublicado, Archivado) | `--color-surface-soft` / `--color-text-secondary` | 5,54 |
| PUBLISHED, ACTIVE | `--brand-blue-light` / `--color-primary` | 7,45 |
| DRAFT | `--color-warning-soft` / `--color-warning` | 4,51 (en el límite AA) |
| PENDING_CHANGES | `--brand-pink-light` / `--brand-crimson` | 7,57 |
| CANCELLED | `--color-error-soft` / `--color-error` | 5,30 |

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
  - el overlay de pantalla completa de `AddStudentsModal` (30) queda por debajo de la cabecera (50);
  - `customOptionsList` de `EntityProfileLayout` (50) empata con la cabecera.
- La migración de consumidores a `var(--z-*)` se hace al migrar cada componente o módulo
  (DS2–DS4), en su propia subetapa y con validación browser.
- Los `<dialog>` nativos (`PortalDialog`, `ConfirmDialog` en modo `native` y los modales
  con `showModal()`) se muestran en la *top layer* del navegador, que **no se ordena con
  `z-index`**: ningún `--z-*` coloca un elemento por encima de ellos. Un toast visible sobre
  un `<dialog>` requiere una solución de *top layer*, no un valor mayor.
- Los valores locales `1` y `2` (orden dentro de un mismo componente) no forman parte de la escala.

## Breakpoints

- **Hoy:** no hay tokens de breakpoint (CSS Modules no admite custom media sin un
  plugin). El código usa 21 valores distintos; los más frecuentes son 640, 768, 600 y 480px.
- **Canónicos aprobados:** `480px`, `640px`, `768px`, `1024px`. Se adoptan en el código nuevo y en cada módulo al migrarlo; el código no migrado conserva sus valores actuales.
  Se documentan aquí y se usarían literalmente en `@media`; los contratos CSS podrán
  comprobar que los archivos migrados solo usan estos valores.
- **Anchos de validación:** 320, 390, 768 y 1440px (ver [validation.md](validation.md)).
