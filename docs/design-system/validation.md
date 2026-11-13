# Validación

Cada subetapa del Design System se cierra con esta lista. Se informa como PASS,
FAIL o NOT VERIFIED, con el comando y su resultado. Nunca se ocultan ni se debilitan
pruebas para conseguir un PASS.

## 1. Pruebas Node (`node:test`)

No hay script `npm test`; se ejecutan con `node --test <archivos>`.

| Cambio | Ejecutar |
|---|---|
| Una feature (`src/features/<f>/**`) | `src/features/<f>/tests/*.test.mjs` |
| Componentes compartidos o estilos (`src/shared/components/**`, `src/shared/styles/**`, tokens) | `src/shared/tests/cssContracts.test.mjs` + las pruebas de las features que los consumen (localizarlas con `grep` del import) |
| `features/portal-shared/**` | Sus pruebas + las integraciones de las features del portal que lo importan |
| Navegación (`headerNavigation.config.ts`) | `src/shared/tests/headerNavigation.test.mjs` |
| Helper de perfiles browser | `src/shared/tests/browserProfile.test.mjs` |
| Cierre de una etapa con cambios compartidos | Batería completa: `node --test $(find src -name "*.test.mjs")` |

`cssContracts.test.mjs` es el lugar para las reglas comprobables, por ejemplo que los archivos ya migrados no contengan literales.

## 2. Lint, build y diff

```
npx eslint <archivos modificados>
npm run build        # tsc -b && vite build
git diff --check
```

## 3. Pruebas browser (`*.browser.mjs`)

- Levantan Vite y Chrome por CDP con **transporte HTTP simulado**: no tocan el backend.
- **Ejecutar en secuencia**, una cada vez y solo las de la feature afectada. Chrome en `EIDA_QA_CHROME` si no está en la ruta por defecto.
- **Uso obligatorio de [`browserProfile.mjs`](../../src/shared/tests/browserProfile.mjs)** en todo script nuevo o modificado:
  - `createBrowserProfile('<nombre>')` como primera instrucción del `try`;
  - `cleanupBrowserProfile(perfil, chrome)` en el `finally`;
  - nunca `mkdtemp` propio, `chrome.kill()` suelto ni `process.exit()` dentro del `finally`.
- **La evidencia va fuera del perfil temporal:** `.validation.local/<script>/` (ignorado por git). El perfil se borra al terminar y lo que quede dentro se pierde.
- Para no sobrescribir evidencia anterior: `HU34_QA_OUTPUT=<dir>` y `HU42_QA_OUTPUT=<dir>`.
- Al terminar, comprobar que no quedan perfiles `eida-*` nuevos en `%TEMP%` (comparar por nombre antes y después). No borrar perfiles de otras ejecuciones.
- **`hu40.browser.mjs` y `hu41.browser.mjs` usan la app y el backend reales** (hu41 crea datos): no ejecutarlas sin autorización expresa. Sin ella, validarlas solo con `node --check`.

## 4. Anchos y comprobaciones visuales

Validar las pantallas afectadas a **320, 390, 768 y 1440px**:

- sin desbordamiento horizontal (`scrollWidth <= clientWidth`);
- controles y textos dentro de su contenedor, sin recortes;
- alineación de filas de filtros y cabeceras (comprobar con tolerancias, sin coordenadas absolutas);
- contraste AA de badges y texto sobre fondo (medir los colores calculados);
- foco visible y orden de tabulación; Escape y retorno del foco en diálogos.

Pantallas representativas (DS0): `/`, `/news`, `/calendar`, `/services`, login;
`/admin`, `/admin/users/manage`, `/admin/students/manage`, `/admin/teachers/:id`,
`/admin/subjects`, `/admin/rooms/import`, `/admin/portal/news`; `/teacher/exams`,
`/teacher/exams/:id/eligibilities`, `/exams/:id/entry-control`; `/students`, `/qr`, `/profile`.

## 5. Cierre de subetapa

1. Pruebas Node pertinentes en verde.
2. ESLint, build y `git diff --check` en verde.
3. Pruebas browser de la feature en verde, sin perfiles nuevos y con evidencia en `.validation.local/`.
4. Los cuatro anchos verificados.
5. [PROGRESS.md](PROGRESS.md) actualizado (estado, fecha y evidencia).
