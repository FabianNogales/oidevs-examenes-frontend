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
- **Pruebas en vivo con puerta explícita (DS5-F1).** Inventario cerrado en [`liveQa.test.mjs`](../../src/shared/tests/liveQa.test.mjs): `hu41` (app Vite 5173, backend 8000, login real y creación de datos), `sprint3.integration` (Laravel real con PostgreSQL desechable) y la parte en vivo de `hu40` (solo GET; su parte simulada sí se ejecuta por defecto). Sin `EIDA_LIVE_QA=<nombre>` (`hu40`, `hu41` o `sprint3`; valores genéricos como `1` no sirven) imprimen `SKIP` y salen con 0 antes de abrir perfiles, red o ficheros. Una batería general trata `SKIP` como omitida, nunca como PASS. Para activarlas hace falta: autorización expresa para ese entorno, backend local y datos desechables (nunca de desarrollo ni de terceros) y credenciales de prueba propias por variables de entorno (las de `hu41` por defecto son de demo y ya están publicadas).
- Todo script nuevo que use hosts reales, credenciales o datos persistentes debe usar `requireLiveQa` y entrar en ese inventario; si no, `liveQa.test.mjs` falla.
- **Limitación conocida (`hu40`)**: el agente de IA no puede ejecutar `hu40.browser.mjs`, ni siquiera su parte simulada. El clasificador de permisos de la herramienta lo bloquea como lectura de producción, porque el script contiene llamadas a la app y al backend reales, aunque estén tras la puerta. Su aislamiento se prueba sin ejecutarlo: el árbol sintáctico demuestra que todos los hosts reales están dentro de `if (liveQa)` y que fuera solo hay URL `127.0.0.1` con el puerto dinámico del Vite o Chrome propios. Una mutación que saca una navegación a 5173 del bloque hace fallar la prueba. Sin `EIDA_LIVE_QA`, su parte simulada solo puede ejecutarla una persona.
- Incidente DS5 (2026-11-08): una batería general ejecutó `hu40` y `hu41` sin puerta. `hu41` hizo un login real de administración demo y 3 GET (0 noticias creadas o editadas) y `hu40` hizo 6 GET públicos. La sesión creada no se cerró por API.

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
