# Tokens

Fuente: [`src/assets/styles/global.css`](../../src/assets/styles/global.css)
(verificado en `f3cf6f5`). Esta página distingue:

- ✅ **Existente:** definido hoy en `global.css`; se puede usar.
- 🕒 **Propuesto (pendiente):** diseño aceptado, pero no implementado; no existe todavía en el código. Se creará en DS1.4. **No usar.**

Regla: consumir siempre los tokens semánticos `--color-*`, no la paleta `--brand-*`
(el propio `global.css` lo indica: "Components should consume semantic tokens").

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

## 🕒 Tokens semánticos propuestos (pendientes de DS1, no existen)

Se definirán **a partir de tokens existentes**. Nombres y correspondencia aceptados
como diseño pendiente; no están implementados:

| Token propuesto | Correspondencia propuesta |
|---|---|
| `--status-neutral-bg` / `-fg` | `--color-surface-soft` / `--color-text-secondary` |
| `--status-info-bg` / `-fg` | `--color-info-soft` / `--color-primary` |
| `--status-success-bg` / `-fg` | `--color-success-soft` / `--color-success` |
| `--status-warning-bg` / `-fg` | `--color-warning-soft` / `--color-warning` |
| `--status-danger-bg` / `-fg` | `--color-error-soft` / `--color-error` |
| `--control-height` / `--control-height-sm` | `--button-height` (44px) / 36px (altura usada hoy por los botones secundarios del portal) |
| `--z-dropdown`, `--z-sticky`, `--z-dialog`, `--z-toast` | Escala por definir (hoy hay valores sueltos: 1, 2, 20, 30, 50, 60, 200, 1000) |

## Breakpoints

- **Hoy:** no hay tokens de breakpoint (CSS Modules no admite custom media sin un
  plugin). El código usa 21 valores distintos; los más frecuentes son 640, 768, 600 y 480px.
- **Canónicos aprobados:** `480px`, `640px`, `768px`, `1024px`. Se adoptan en el código nuevo y en cada módulo al migrarlo; el código no migrado conserva sus valores actuales.
  Se documentan aquí y se usarían literalmente en `@media`; los contratos CSS podrán
  comprobar que los archivos migrados solo usan estos valores.
- **Anchos de validación:** 320, 390, 768 y 1440px (ver [validation.md](validation.md)).
