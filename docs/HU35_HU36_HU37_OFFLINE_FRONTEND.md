# HU35, HU36 y HU37 — Frontend offline inicial

## 1. Alcance y auditoría inicial

Implementación React/TypeScript conectada a las cuatro rutas offline existentes de Laravel. No se modificó el backend, sus reglas ni su base de datos. No se instalaron dependencias.

Al comenzar, el frontend estaba limpio, sin staging ni modificaciones previas. Rama `Dev_Fab`; HEAD `93ca5c84cd83ad95dcc74fd7558306ac362c5b57`. Se consultó el documento backend obligatorio, `OfflineExamController`, `SyncOfflineEntriesRequest`, los tres servicios offline y las rutas reales. Los cambios backend de la tarea anterior se conservaron.

La auditoría encontró módulos en `src/features`, layouts en `src/layouts`, cliente Axios compartido, rutas con `ProtectedRoute`/Sanctum, CSS Modules y tokens institucionales, Poppins local mediante `@fontsource/poppins`, modales con foco controlado, tablas y notificaciones compartidas. HU14 usa `useEntryQrCamera` con detector nativo y ZXing alternativo; gestiona permisos, pausas, cambios de cámara, linterna y cierre de streams. No había IndexedDB, Service Worker ni dependencia PWA.

## 2. Propuesta visual implementada

Se conserva la tipografía Poppins, títulos azul marino, acentos carmesí existentes, fondo azul claro, tarjetas blancas, botones y estados basados en los tokens actuales. No se rediseña EIDA globalmente.

- **Distribución docente:** breadcrumb del examen, resumen institucional reutilizado, tres indicadores, confirmación antes de preparar y tarjetas por responsable. Cada tarjeta muestra rango, cantidad y versión; abre la tabla de estudiantes en el modal existente.
- **Preparación:** encabezado institucional compacto, conexión permanente, resumen de examen/lista, fechas y guardado local. Se diferencia la persistencia del paquete de la disponibilidad del shell PWA. Un fallo de IndexedDB nunca genera un mensaje de preparación exitosa.
- **Control móvil:** indicadores breves, selector manual/QR, búsqueda local y tarjetas de estudiantes, sin tablas horizontales. El modal reutiliza la identidad de HU14 y exige confirmar identidad/ambiente antes de guardar. La cámara ocupa un visor amplio y se activa por acción explícita.
- **Sincronización:** cinco contadores, envío manual y resultados individuales como tarjetas. Los detalles técnicos del UUID quedan plegados. Conflictos y rechazos se conservan y muestran el motivo del servidor.
- **Mis listas locales:** acceso compacto a los exámenes descargados por la misma cuenta; también es la entrada de la PWA.

Los indicadores de red dicen **Red disponible** o **Sin conexión**. No equivalen a autenticación vigente ni a una operación aceptada por Laravel.

## 3. Pantallas, rutas y navegación

| Ruta frontend | Pantalla y protección |
| --- | --- |
| `/teacher/exams/:examId/offline/assignments` | Distribución; conserva `ProtectedRoute` con DOCENTE y consulta del examen propio en backend. |
| `/exams/:examId/offline?view=prepare` | Preparación de dispositivo para la lista propia. |
| `/exams/:examId/offline?view=control` | Captura manual/QR y consulta local. |
| `/exams/:examId/offline?view=sync` | Cola y resultados individuales. |
| `/offline` | Listas locales de la identidad conservada en esta pestaña. |

Se agregaron accesos desde `ExamTools`, el detalle docente del examen, cada colaboración y el encabezado del control online. La navegación online de HU13/HU14 no fue reemplazada ni sus solicitudes modificadas.

Las dos rutas locales están fuera de `ProtectedRoute`/`AppLayout`, pero dentro del manejador existente de eventos de autenticación. Su `OfflineAccessGate` controla la continuidad local; no autoriza llamadas al servidor ni convierte al usuario local en una sesión autenticada global. Esto evita que `/me` o la consulta de colaboraciones bloqueen una lista preparada al recargar sin red.

## 4. Componentes reutilizados y nuevos

Reutilizados sin modificar su implementación:

- `ExamInformation` y `ExamsSkeleton` para contexto y carga docente.
- `Breadcrumbs`, `DataTable`, `CollaborationModal`, `HeaderLogo` y `Footer`.
- `EntryQrStudentIdentity`, con fotografía nula porque el contrato offline no contiene imágenes.
- `EntryConditionBadge` y `eligibilityDisplay` para habilitación conocida.
- `useEntryQrCamera` y su biblioteca ZXing, sin duplicar adquisición/cierre de cámara.
- `useAuth`, `Snackbar`, cliente `httpClient`, manejo de errores y consulta del examen existentes.
- Estilos de botones del módulo de colaboraciones y tokens CSS globales.

Nuevos componentes específicos: `OfflineAccessGate`, `OfflineConnectionStatus`, `OfflineAssignmentCards`, `OfflineExamSummary`, `OfflinePreparationPanel`, `OfflineStudentList`, `OfflineQrScanner`, `OfflineCapturePanel`, `OfflineSyncPanel` y `OfflineDataDeletion`. Las páginas y los componentes quedan por debajo de 300 líneas aproximadamente después del formato, con lógica de persistencia y sincronización separada.

## 5. Arquitectura y carpetas

```text
build/
  offlinePwa.ts                 # Plugin pequeño de Vite; emite un único SW de producción
public/
  manifest.webmanifest
  eida-offline.svg               # Copia del logo vectorial existente
src/features/offline-entry/
  api/offlineApi.ts              # Cuatro endpoints, cliente existente y errores visibles
  components/                   # Presentación, modales y controles reutilizables del módulo
  hooks/
    useConnectivity.ts          # Indicador de red y reloj local de referencia
    useOfflineAssignments.ts    # Consulta/preparación docente
    useOfflinePackage.ts        # Lectura reactiva de paquetes/eventos locales
    useOfflinePreparation.ts    # Descarga, persistencia y confirmación del shell
    useOfflineCapture.ts        # Guardado local y notificación posterior al commit
    useOfflineSync.ts           # Estado/progreso de UI del envío
  pages/
    TeacherDistributionPage.tsx
    OfflineEntryPage.tsx         # Composición de las tres pestañas
    OfflineHomePage.tsx
  services/
    offlineIdentity.ts          # Continuidad local y aislamiento de cuentas
    offlinePwa.ts               # Registro y comprobación de recursos cacheados
    offlineSync.ts              # Lotes, exclusión y coordinación HTTP/persistencia
  storage/
    offlineDatabase.ts         # Apertura, transacciones y avisos entre pestañas
    offlineStore.ts            # Paquetes, eventos, resultados, leases y borrado acotado
  types/offline.types.ts
  utils/
    offlineContract.ts         # Validación runtime y proyección mínima de datos
    offlineRules.ts            # Búsqueda, bloqueos locales y captura QR provisional
  tests/                       # Node focalizado y comprobaciones de IndexedDB en navegador
```

No hay estado global nuevo para la distribución, los estudiantes o los eventos. IndexedDB es la persistencia local y el estado de las páginas se acota a cuenta/contexto/examen. El historial oficial sigue siendo exclusivamente el backend.

## 6. Contratos API consumidos

El cliente usa `httpClient`, sus cookies/XSRF e interceptores existentes. Las rutas se añaden a `VITE_API_URL`, que debe incluir el prefijo real `/api/v1` (por ejemplo `/backend/api/v1`). No se concatenan dos prefijos.

| Método | Ruta relativa al cliente | Respuesta utilizada |
| --- | --- | --- |
| POST | `/exams/{id}/offline/prepare` | `data`: examen, versión, preparación y listas con responsables/miembros. Body `{}`. |
| GET | `/exams/{id}/offline/assignments` | Mismo contrato de distribución. |
| GET | `/exams/{id}/offline/package` | `data`: UUID, examen, lista, versión, responsable, fechas, ambiente, estudiantes y `SERVER_ON_SYNC`. |
| POST | `/exams/{id}/offline/sync` | `data.exam_id` y `data.results[]`, con UUID, estado, código, mensaje e ID de ingreso o nulo. |

También se reutilizan la consulta docente del examen, la lista de colaboradores y el resumen de inscritos para los indicadores. Si un indicador auxiliar no se puede consultar, muestra `—`, no un cero inventado. Tras preparar, la distribución real determina la cantidad asignada y los colaboradores con lista. El contrato de distribución no entrega habilitaciones; esa tabla no inventa ese campo.

Ejemplo de lote, generado a partir de eventos persistidos:

```json
{
  "package_id": "1ba37ca3-1c61-4ed0-8740-a53776bb4d90",
  "list_id": 8,
  "version": 1,
  "room_id": 3,
  "events": [{
    "event_id": "74921761-bba4-4ca5-8fc5-27016fc534c7",
    "student_id": 101,
    "method": "MANUAL",
    "captured_at": "2027-01-15T14:05:00.000Z"
  }]
}
```

Para QR, el evento agrega `qr_token` con la lectura original y `method: "QR"`. No envía responsables, estados oficiales, claves ni marcas de validez. `device_id` es opcional en backend y no se genera una huella física del dispositivo.

Se validan datos `unknown` en runtime, cuenta/examen/ambiente, UUID, fechas, unicidad de miembros y estructura de resultados. Antes de persistir el paquete se proyectan únicamente campos permitidos: datos extra del backend no se copian automáticamente a IndexedDB. Una respuesta de sincronización incompleta, contradictoria, duplicada o por otro examen no marca eventos como recibidos.

## 7. IndexedDB y persistencia

Base local: **`eida-offline-entry-v1`**, versión de esquema 1.

| Object store | Función |
| --- | --- |
| `packages` | Paquetes por clave `ownerId:packageId`, indexados por cuenta y cuenta/examen. Guarda snapshot mínimo, fecha local de guardado y motivo de desactualización conocido. |
| `events` | Evento inmutable de envío, referencias originales, estado local y resultado individual. Índice único `(ownerId, examId, payload.student_id)` para impedir doble captura incluso entre pestañas. |
| `locks` | Lease breve por cuenta/examen para coordinar sincronización y evitar borrar mientras se está enviando. |

Se informa éxito después de `transaction.oncomplete`, no al emitir una petición de escritura. Se manejan bloqueo, falta de permisos, indisponibilidad y errores de almacenamiento. Se solicita `navigator.storage.persist()` como mejora opcional, sin afirmar que el navegador la concedió ni que los datos son infalibles.

Cada descarga crea un paquete distinto en backend. Los anteriores se conservan: un evento pendiente siempre conserva UUID, método, fecha, evidencia QR y su paquete/lista/versión/ambiente originales. Descargar de nuevo no mueve ni reescribe la cola.

Los eventos no se eliminan al salir de la pantalla ni al cerrar sesión. El borrado está en Preparación y se limita a la cuenta y examen actuales. Exige confirmación y, si hay pendientes, conflictos o rechazos, reconocimiento explícito de la pérdida. No borra datos de otras cuentas ni modifica ingresos del servidor.

## 8. Continuidad local y seguridad de sesión

Después de una comprobación real de `/me` o de login se conserva en **sessionStorage** un contexto mínimo: ID de cuenta, nombre visible, instante de comprobación y nonce local. No incluye correo, roles, contraseñas, cookie, JWT de sesión ni credenciales backend.

La continuidad dura como máximo 24 horas según el reloj local desde la última comprobación online y se limita a esa pestaña. Ese reloj no aporta evidencia temporal confiable. No es una aprobación institucional de vigencia de sesión: es una restricción local de privacidad. No modifica el vencimiento del paquete ni extiende la sesión del servidor.

- Login, logout, `401` y los eventos existentes de expiración/reemplazo invalidan el contexto local.
- Los avisos entre pestañas invalidan acceso al cambiar de cuenta. Se descartan contextos heredados por `window.opener`.
- Toda operación de almacenamiento verifica cuenta y contexto; los hooks impiden presentar respuestas tardías de otra cuenta.
- Una lista no puede recuperarse por el simple hecho de escribir su `examId` en la URL. Se exige contexto previo de la cuenta y el paquete propio.
- No se restaura `AuthProvider.user` desde IndexedDB/sessionStorage. Descargar o sincronizar exige el usuario del proveedor existente; Laravel comprueba la sesión y autorización reales.
- El modo de autenticación simulada no habilita acceso offline.

**Límite deliberado:** una recarga de la misma pestaña preparada puede seguir trabajando sin `/me`, pero cerrar la pestaña, cambiar de cuenta, bloquear acceso o perder/expirar sessionStorage puede exigir conexión y reautenticación para recuperar los datos. Los registros siguen en IndexedDB. Un inicio nuevo de PWA o una restauración de navegador no garantiza conservar ese contexto. No se implementó PIN, biometría ni otro método de autenticación offline.

El navegador no es un almacén cifrado ni una frontera frente a DevTools, XSS o alguien con acceso al perfil del sistema. Separación por cuenta y continuidad local no equivalen a cifrado o prueba criptográfica de identidad. Las revocaciones ocurridas mientras no hay conexión no pueden conocerse localmente; las capturas siguen siendo provisionales y el servidor decide.

## 9. PWA y recursos offline

`offlinePwaPlugin` emite **`offline-sw.js`** durante un build de producción, con una lista explícita de archivos generados: HTML del shell, JavaScript, CSS, fuentes Poppins e imágenes estáticas importadas. Agrega manifiesto e icono institucional. El nombre de caché incluye una huella de contenidos, incluidos manifiesto/icono. No hay una segunda librería PWA ni otro worker.

El worker precachea esos recursos con credenciales omitidas. Sirve el shell para `/offline` y `/exams/{id}/offline`, incluidas sus pestañas por query string. Solo atiende los recursos estáticos listados; **no intercepta ni cachea APIs autenticadas, login/logout, fotografías de `/storage`, peticiones POST o recursos externos**. Los datos de listas y la cola se mantienen únicamente en IndexedDB.

La preparación consulta al worker mediante `MessageChannel`, comprueba presencia de los recursos y aplica un tiempo límite. No guarda un booleano permanente de “PWA lista” sin volver a comprobarla. Si hay paquete pero no shell confirmado, muestra preparación parcial y explica el motivo.

Las actualizaciones no fuerzan `skipWaiting`. El worker activa la nueva versión cuando corresponde al ciclo del navegador y limpia únicamente cachés `eida-offline-shell-*`; no elimina IndexedDB, eventos ni cachés de otros módulos.

Requisitos y límites:

- Producción en la raíz del origen (`base: '/'`), como el router actual. Para subdirectorios deben revisarse manifest/rutas; el plugin falla explícitamente en lugar de emitir un precache incorrecto.
- HTTPS confiable en un celular; `localhost` seguro permite comprobaciones locales en computadora. No se eluden permisos de cámara.
- Manifest con `start_url: /offline`, nombre EIDA y el logo SVG existente. La oferta de instalación depende del navegador; no se afirma instalación física comprobada.
- El servidor de Vite de desarrollo no instala este worker. Se puede verificar la lógica/IndexedDB en desarrollo, pero no prometer recarga offline completa de ese servidor.
- No se ejecutó el build general ni se desplegó esta tarea. La emisión completa de assets y la apertura sin red de una versión servida por HTTPS quedan pendientes de comprobación. El código del worker se probó aisladamente.
- No es necesario que la aplicación esté instalada para usar el worker desde una pestaña preparada. Debe descargarse todo antes de desconectarse.
- El almacenamiento del navegador puede ser eliminado o evicto. “Preparado” confirma el estado observado, no durabilidad infalible.

## 10. Flujo HU35 y preparación HU36

1. Docente: Mis exámenes → Detalle → Distribución de listas.
2. Consultar datos reales; confirmar preparación, incluyendo la advertencia de congelación en versión 1. No existe reasignación manual ni regeneración.
3. Revisar tarjetas/rangos y estudiantes asignados. Sin colaboradores, el servidor asigna al docente; sin estudiantes, las listas pueden estar vacías.
4. Responsable: desde colaboración, control online o acceso contextual, abrir Preparación.
5. Descargar el paquete propio; validar contrato; confirmar commit IndexedDB y comprobar shell.
6. Revisar lista, versión, horario y vigencia antes de ir a Control local.

El docente que supervisa listas asignadas a colaboradores no obtiene sus paquetes: backend devuelve `403` si no tiene lista propia. El frontend no solicita un `list_id` ajeno para eludir esa regla. El error se presenta y los eventos existentes se conservan.

## 11. Captura manual y QR

La búsqueda usa exclusivamente estudiantes del paquete y admite SIS, CI, nombres, apellidos y varias palabras. Se mantiene el orden recibido del servidor. No hay búsquedas HTTP durante la consulta local ni incorporación arbitraria de estudiantes.

Para capturar se exige perfil/inscripción `ACTIVE`, habilitación conocida `ELIGIBLE`, ausencia de ingreso conocido y de un evento local anterior. El índice único protege también capturas simultáneas. Un registro conflictivo/rechazado previo bloquea otra captura con UUID nuevo en este dispositivo; no se oculta un conflicto generando otro evento.

El paquete desactualizado, vencido o fuera del horario según el reloj local bloquea nuevas capturas. La hora del teléfono es solo referencia y puede equivocarse. Todas las fechas visibles se expresan en `America/La_Paz`.

La confirmación presenta identidad y ambiente, exige reconocimiento presencial y guarda un UUID nuevo una sola vez. El mensaje es **Ingreso guardado en este dispositivo. Pendiente de sincronización.** No se presenta como asistencia oficial.

### Limitación real del QR v2

El JWT HS256 del backend solo contiene `v`, `jti` y `exp`. El paquete no incluye una correspondencia `jti → student_id`. Por tanto, **no puede identificarse ni ubicarse automáticamente al titular del QR sin conexión**.

Flujo implementado: activar la cámara existente → capturar un JWT con estructura v2 → buscar al estudiante en la lista → comprobar su identidad → vincular provisionalmente la lectura al estudiante confirmado. La firma no se verifica localmente. El token completo se guarda como evidencia de ese evento, nunca se muestra ni se registra en consola. No es un token de sesión; sigue siendo información sensible necesaria para la sincronización.

Un QR opaco de otra lista no permite un rechazo local por titular, porque ese titular es desconocido. La UI lo explica; solo permite seleccionar miembros propios. Laravel comprueba después correspondencia, firma, estado, revocación y vigencia. Si no coinciden, el resultado será rechazo/conflicto, sin asistencia oficial nueva.

Se bloquean localmente formatos ajenos y QR que parecen vencidos según el reloj del dispositivo. El modo manual permanece separado; no se convierte silenciosamente un escaneo fallido en ingreso manual.

## 12. HU37: lotes, idempotencia y estados

Solo `PENDING` se envía. Se agrupa por paquete/lista/versión/ambiente original y se divide en lotes de máximo 100. Los lotes se procesan secuencialmente. Cada respuesta validada se persiste antes de continuar.

| Estado local/servidor | Presentación |
| --- | --- |
| `PENDING` | Pendiente de envío; ingreso provisional guardado únicamente en este dispositivo. |
| `ACCEPTED` | Ingreso sincronizado exitosamente; se conserva ID oficial. |
| `DUPLICATE` | El estudiante ya tiene un ingreso registrado; no se presenta como un ingreso nuevo. |
| `CONFLICT` | Necesita revisión, con el motivo del servidor. |
| `REJECTED` | Rechazado, con motivo; el evento se conserva. |

`PENDING` es un estado local, no una respuesta inventada de Laravel. HTTP `200` no equivale a todos aceptados: se muestran los resultados individuales y un resumen con todas las categorías.

Un fallo de red, aborto, `500` o respuesta incompleta mantiene pendientes los eventos no confirmados localmente. Se reenvían exactamente UUID/payload/paquete originales para que el backend recupere resultados idempotentes, incluso si había confirmado algunos ingresos antes de perderse la respuesta. Un paquete nuevo nunca sustituye el usado por aquellos eventos.

Se bloquean envíos simultáneos en la misma pestaña y se utiliza Web Locks entre pestañas cuando está disponible, además de un lease IndexedDB de 90 segundos renovado entre lotes. Sin Web Locks, el lease es coordinación local de mejor esfuerzo y depende del reloj/suspensión del navegador; la garantía final de unicidad e idempotencia pertenece a PostgreSQL/backend.

No hay reintentos infinitos, sincronización en segundo plano ni envío automático al recuperar `navigator.onLine`. El botón manual comprueba el resultado HTTP real. Una cancelación, revocación, versión incompatible, ambiente modificado o snapshot desactualizado conocidos por respuesta del servidor marcan el paquete para revisión y bloquean nuevas capturas con él.

## 13. Errores y datos conservados

- `401`: se conserva IndexedDB, se invalida acceso local mediante el mecanismo existente y se solicita login.
- `403`: mensaje de autorización, paquete conocido marcado para revisión y datos conservados.
- `404`: no se simula un paquete ni una lista. En la distribución, tras verificar el examen docente, se interpreta la ausencia como sin preparar; un backend sin desplegar puede devolver también `404`, y el POST real presentará su error.
- `409 DISTRIBUTION_FROZEN`/`DISTRIBUTION_STALE`: explicación de la restricción sin ofrecer reasignación ni forzar otra versión.
- `419`: solicita renovar sesión; no reescribe UUID ni borra la cola.
- `422`: informa parámetros/lote inválidos; no marca asistencia ni descarta pendientes.
- `429`: pide esperar antes de reintentar; no inicia un bucle.
- Red caída/timeout: conserva eventos, presenta error y deja reintentar manualmente.
- Error de IndexedDB: no declara captura/lista guardada. No se ofrece control local usando un paquete solo en memoria.
- Cámara: conserva los permisos, errores y cierre de streams de HU14; no existe un atajo que evada HTTPS/permisos.

## 14. Pendientes y puntos de extensión

No se implementan HU27, HU28, HU33, HU34, regeneración, nuevas reglas institucionales ni resolución administrativa avanzada.

Pendientes de definición o ampliación con el equipo:

- Identificación automática QR offline: requiere un contrato que permita vinculación verificable a estudiante/examen, claves públicas y manejo de revocaciones. No se resuelve agregando una propiedad ficticia al frontend.
- Autorización offline tras cerrar completamente el navegador: requiere acordar controles locales adicionales; esta versión exige revalidar cuando se pierde el contexto de pestaña.
- Política institucional de sincronización después del cierre: actualmente backend devuelve conflicto; la UI no la flexibiliza.
- Versionado/regeneración futura de listas, liberación de eventos rechazados para nueva captura y resolución supervisada.
- Retención, cifrado local si se acuerda un modelo de amenazas, exportación autorizada de evidencia y tratamiento de dispositivos compartidos.
- Fotos offline solo si el contrato futuro las autoriza y justifica; hoy no se descargan.
- Instalación/compatibilidad PWA por navegador y revisión visual física de móvil.

Extensiones claras: contratos en `offlineContract`, reglas puras en `offlineRules`, operaciones atómicas en `offlineStore`, coordinación de envío en `offlineSync`, identidad local en `offlineIdentity`, caché pública en `build/offlinePwa`. Cambiar la UI no requiere alterar el esquema de eventos ni el cliente HTTP compartido.

## 15. Pruebas creadas y verificaciones ejecutadas

Pruebas focalizadas Node: contratos reales, distribución y estados vacíos, preparación/repetición/errores, proyección mínima, aislamiento/expiración de identidad, búsqueda, elegibilidad y duplicados, QR provisional, persistencia antes de notificar, fallo de almacenamiento, revocación/cancelación, lotes de 100, payload estable, respuesta interrumpida, resultados mixtos y exclusión de sincronizaciones. Las pruebas de coordinación simulan los límites HTTP/almacenamiento; no afirman ejecutar Laravel.

```powershell
$offlineTestFiles = @(Get-ChildItem -LiteralPath src/features/offline-entry/tests -Filter '*.test.mjs' | ForEach-Object { $_.FullName })
node --test @offlineTestFiles
node src/features/offline-entry/tests/typecheck.mjs
```

El chequeo TypeScript es focalizado, sin emitir archivos: módulo nuevo, pruebas TS de almacenamiento y plugin/configuración Vite. No ejecuta `tsc -b`, build, lint ni suite globales.

Prueba real de IndexedDB en un perfil Edge nuevo, sin servidor de aplicación ni llamadas backend:

```powershell
node --experimental-websocket src/features/offline-entry/tests/indexedDb.browser.mjs
```

El runner transforma solo el código de la prueba y sus módulos puros de almacenamiento/contratos, abre un HTML temporal aislado y comprueba transacciones, capturas concurrentes únicas, aislamiento de cuenta, conservación de resultados, recarga completa y borrado controlado. No compila la aplicación ni prueba el Service Worker de producción. El perfil y los archivos nuevos se eliminan únicamente después de comprobar la ruta temporal creada por el propio runner. `EIDA_TEST_BROWSER` permite indicar un Chromium compatible; no instala navegadores.

También se puede abrir manualmente `src/features/offline-entry/tests/storage.browser.html` en un Vite ya iniciado por el desarrollador, **solo en un perfil/origen aislado**. Usar sus tres botones en orden. Esa página contiene datos ficticios exclusivamente de pruebas y no forma parte del flujo productivo ni se importa desde el router.

Se ejecutaron además cuatro archivos existentes focalizados: `entryControl.integration.test.mjs`, `entryAvailability.test.mjs`, `examDetailPresentation.test.mjs` y `studentImportPrivacy.test.mjs`, para comprobar compatibilidad de cámara/control, disponibilidad, detalle y ciclo de autenticación/privacidad.

Resultados ejecutados:

| Verificación | Resultado |
| --- | --- |
| Pruebas Node del módulo nuevo | **36 aprobadas**, sin fallos ni omisiones. |
| Cuatro archivos existentes de regresión focalizada | **67 aprobadas**, sin fallos ni omisiones. |
| IndexedDB real en perfil Edge aislado | **Aprobada**, incluida recarga completa; `Edg/156.0.4314.58`. |
| TypeScript estricto focalizado, sin emisión | **0 diagnósticos**. |
| `git diff --check` | Aprobado. |

Las pruebas Node suman 103 casos entre ambas ejecuciones focalizadas. El worker y su hook de generación se prueban sin ejecutar el build general; también se comprueba que una espera indefinida de registro no produzca un falso estado de preparación.

No se ejecutaron suite completa, build ni lint globales. No se inició servidor frontend/backend ni se aplicaron migraciones. La revisión visual, el deploy HTTPS/PWA y un celular físico siguen pendientes; no se presentan las pruebas simuladas ni el Edge aislado como validación física móvil.

## 16. Guía de revisión manual en computadora y celular

Antes de probar con datos reales: backend con la migración offline previamente revisada/aplicada por quien tenga autorización, endpoints desplegados y autenticación real (`VITE_USE_AUTH_MOCK=false`). No aplicar migraciones desde esta tarea frontend. Para offline completo hace falta una versión de producción servida por HTTPS, no únicamente Vite de desarrollo. Verificar en Network que `/offline-sw.js` responde JavaScript, no el fallback HTML del hosting, y que el manifiesto/recursos se entregan correctamente.

### Computadora — docente

1. Abrir examen propio y Distribución de listas. Revisar nombre, ambiente, horario, inscritos y colaboradores.
2. Confirmar preparación y revisar rangos/counts; abrir estudiantes y buscar por SIS/apellidos. Repetir consulta sin crear listas nuevas.
3. Revisar examen sin colaboradores y sin estudiantes. Comprobar que no se ofrece reasignación/regeneración.
4. Probar cuenta ajena y errores de preparación: no debe obtener datos de otro examen ni ver éxitos simulados.

### Celular o navegador estrecho — preparación y captura

1. En HTTPS confiable, iniciar sesión con el responsable real, abrir su examen y descargar lista. Esperar confirmación tanto de datos como del shell.
2. Guardar la URL `/exams/{id}/offline?view=control` y mantener la misma pestaña. Activar modo avión y recargar esa URL. Debe usar la lista local, sin exigir `/me` para presentarla.
3. Buscar por SIS/CI/nombres/apellidos; comprobar únicamente la lista propia y estados conocidos. Capturar manualmente con confirmación, recargar y verificar que el evento continúa pendiente.
4. Intentar duplicar el mismo estudiante; debe impedir otra captura. Probar en dos pestañas autorizadas: el índice local mantiene un solo evento en ese navegador/origen.
5. Activar cámara, denegar permiso, reintentar, pausar y cambiar de pestaña/pantalla. Comprobar cierre del stream. Capturar QR y confirmar manualmente un estudiante propio; nunca debe decir firma/autenticidad verificada offline.
6. Probar paquete vencido y una revocación conocida al reconectar. No debe permitir nuevas capturas basadas en un snapshot ya invalidado.

### Sincronización y privacidad

1. Recuperar red y, si hace falta, verificar sesión. Enviar pendientes; contrastar resultados con el historial online existente.
2. Interrumpir conexión durante el envío y reintentar: conservar UUID/payload y evitar una segunda asistencia oficial.
3. Probar casos reales de duplicado, QR incorrecto, habilitación modificada y revocación. Mostrar motivos; conservar conflictos/rechazos.
4. Con más de 100 pendientes, comprobar lotes secuenciales; no mezclar paquetes originales.
5. Cerrar/cambiar sesión: no mostrar datos de la cuenta anterior. Reingresar con el mismo responsable y comprobar recuperación de su cola.
6. Probar el bloqueo local y luego revalidar con conexión. Probar eliminación con pendientes: exigir reconocimiento y conservarlos al cancelar.
7. En DevTools, comprobar que Cache Storage contiene solamente shell/assets y que los paquetes/eventos están en IndexedDB, separados por cuenta.

## 17. Estado Git y archivos existentes modificados

Se conserva rama/HEAD/staging iniciales. El índice estaba vacío y su huella permanece `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`. No había cambios frontend previos que sobrescribir. No se cambió de rama, no se accedió a repositorios `-compare`, no se buscó desde `proyecto`, ni se hicieron commits/push o comandos Git de preparación/restauración.

Archivos existentes modificados:

```text
index.html                                            # Idioma y metadatos PWA
src/main.tsx                                          # Registro SW en producción y descarte de contexto heredado
vite.config.ts                                        # Plugin PWA nativo, sin dependencias nuevas
src/app/providers/AuthProvider.tsx                     # Crear/invalidar continuidad tras eventos reales de sesión
src/app/router/router.tsx                             # Tres rutas nuevas
src/features/exams/components/ExamTools.tsx             # Accesos contextuales
src/features/exams/pages/TeacherExamDetailPage.tsx      # Accesos desde el detalle
src/features/exams/pages/EntryControlPage.tsx           # Enlace complementario; flujo online conservado
src/features/collaborations/pages/CollaboratorPage.tsx # Acceso desde la colaboración
```

Nuevos: módulo `src/features/offline-entry` con los archivos descritos en el árbol, `build/offlinePwa.ts`, `public/manifest.webmanifest`, `public/eida-offline.svg` y este documento. El backend se consultó únicamente en lectura; conserva sus cambios previos.

## 18. Inventario completo de archivos nuevos

46 archivos nuevos:

```text
build/offlinePwa.ts
docs/HU35_HU36_HU37_OFFLINE_FRONTEND.md
public/eida-offline.svg
public/manifest.webmanifest
src/features/offline-entry/api/offlineApi.ts
src/features/offline-entry/components/OfflineAccessGate.tsx
src/features/offline-entry/components/OfflineAssignmentCards.tsx
src/features/offline-entry/components/OfflineCapturePanel.tsx
src/features/offline-entry/components/OfflineConnectionStatus.tsx
src/features/offline-entry/components/OfflineDataDeletion.tsx
src/features/offline-entry/components/OfflineEntry.module.css
src/features/offline-entry/components/OfflineExamSummary.tsx
src/features/offline-entry/components/OfflinePreparationPanel.tsx
src/features/offline-entry/components/OfflineQrScanner.tsx
src/features/offline-entry/components/OfflineStudentList.tsx
src/features/offline-entry/components/OfflineSyncPanel.tsx
src/features/offline-entry/hooks/useConnectivity.ts
src/features/offline-entry/hooks/useOfflineAssignments.ts
src/features/offline-entry/hooks/useOfflineCapture.ts
src/features/offline-entry/hooks/useOfflinePackage.ts
src/features/offline-entry/hooks/useOfflinePreparation.ts
src/features/offline-entry/hooks/useOfflineSync.ts
src/features/offline-entry/pages/OfflineEntryPage.tsx
src/features/offline-entry/pages/OfflineHomePage.tsx
src/features/offline-entry/pages/TeacherDistributionPage.tsx
src/features/offline-entry/services/offlineIdentity.ts
src/features/offline-entry/services/offlinePwa.ts
src/features/offline-entry/services/offlineSync.ts
src/features/offline-entry/storage/offlineDatabase.ts
src/features/offline-entry/storage/offlineStore.ts
src/features/offline-entry/tests/indexedDb.browser.mjs
src/features/offline-entry/tests/offlineAssignments.test.mjs
src/features/offline-entry/tests/offlineContract.test.mjs
src/features/offline-entry/tests/offlineFixtures.mjs
src/features/offline-entry/tests/offlineIdentity.test.mjs
src/features/offline-entry/tests/offlinePreparation.test.mjs
src/features/offline-entry/tests/offlinePwa.test.mjs
src/features/offline-entry/tests/offlineRules.test.mjs
src/features/offline-entry/tests/offlineShell.test.mjs
src/features/offline-entry/tests/offlineSync.test.mjs
src/features/offline-entry/tests/storage.browser.html
src/features/offline-entry/tests/storage.browser.ts
src/features/offline-entry/tests/typecheck.mjs
src/features/offline-entry/types/offline.types.ts
src/features/offline-entry/utils/offlineContract.ts
src/features/offline-entry/utils/offlineRules.ts
```

