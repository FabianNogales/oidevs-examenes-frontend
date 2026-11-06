# Reglas del Design System

Obligatorias para cualquier cambio visual, de estilos o de componentes compartidos.
Las reglas de git (ramas, PR y autorizaciones) están en [README.md](README.md) › Colaboración.

## 1. Reutilizar antes de crear
- Buscar en [components.md](components.md) y con `grep` antes de crear un componente, hook o estilo.
- Si existe algo parecido, ampliarlo mediante props en una PR revisada; no copiarlo en la feature.
- Lo que solo usa una feature se queda en esa feature. Se promueve a `shared` cuando lo usan dos o más.

## 2. Sin duplicados
- No crear clases de botón, modales, tablas, paginaciones ni badges nuevos si ya existe un equivalente compartido.
- No crear clases CSS globales nuevas: solo tokens y estilos base en `global.css`.
- No reimplementar Escape, foco ni bloqueo de scroll: usar `PortalDialog` / `ConfirmDialog` y `useBodyScrollLock`.

## 3. Tokens
- Usar tokens semánticos `--color-*`, `--space-*`, `--font-size-*`, `--radius-*` y `--shadow-*` ([tokens.md](tokens.md)), no la paleta `--brand-*` ni colores literales.
- No activar el tema oscuro ni aplicar `data-theme`: sus tokens se conservan, pero está fuera de alcance.
- En los archivos migrados: cero colores literales (`#hex`, `rgb()`) y cero `font-size` en px.
- **Valores en px permitidos cuando se justifican técnicamente:** bordes de 1px, anchos o alturas mínimas de controles táctiles (44px), desplazamientos de foco, `@media` con los breakpoints canónicos y dimensiones que dependen de un contenido fijo (iconos, columnas mínimas). Añadir un comentario breve cuando el motivo no sea evidente.
- No usar tokens 🕒 propuestos hasta que existan en el código.

## 4. Stack
- React 19 con componentes funcionales y exports con nombre; TypeScript estricto.
- CSS Modules junto al componente (`Componente.module.css`); estilos inline solo para valores dinámicos.
- Imports internos con `@/`. Textos de interfaz en español.
- Sin librerías de UI ni dependencias nuevas sin aprobación.

## 5. Sin cambios funcionales
- No cambiar lógica de negocio, roles, permisos, rutas ni contratos de la API.
- Una migración visual conserva props, eventos, textos accesibles y comportamiento. Si hace falta un cambio de comportamiento, va en una etapa aparte y aprobada.

## 6. Accesibilidad
- Todo control tiene nombre accesible (texto, `<label>` o `aria-label`).
- Errores de campo asociados con `aria-invalid` y `aria-describedby`.
- Diálogos: foco inicial dentro, Escape cancela solo el diálogo superior, foco devuelto al control que lo abrió y scroll del `body` bloqueado.
- Contraste AA (4,5:1 para texto normal). El estado nunca se comunica solo con color (texto, forma o icono además del color).
- Foco visible en todos los controles interactivos; navegación completa por teclado.
- Las regiones vivas (`role="status"`) solo para mensajes que cambian, no repetidas por fila.

## 7. Responsive
- Validar a 320, 390, 768 y 1440px: sin desbordamiento horizontal, sin texto ni controles recortados.
- Usar solo los breakpoints canónicos aprobados (480, 640, 768, 1024px) en código nuevo o migrado; no introducir nuevos valores.
- Contenido de página limitado por `--content-max-width` y centrado.

## 8. Migración
- **Una feature por subetapa** (p. ej. `DS3.rooms`), registrada y asignada en [PROGRESS.md](PROGRESS.md) antes de empezar.
- Los cambios en tokens o en componentes compartidos se hacen en su propia subetapa y requieren revisión cruzada.
- Cada subetapa cierra con la validación de [validation.md](validation.md) y actualiza [PROGRESS.md](PROGRESS.md).
