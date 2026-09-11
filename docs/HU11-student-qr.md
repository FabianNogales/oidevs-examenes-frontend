# HU11: QR de ingreso por examen

La pantalla está disponible en `/students/qr`, con un enlace desde el inicio.
La implementación pertenece a `src/features/students/` y utiliza el cliente
compartido sin cambiar su configuración.

## Contrato utilizado

- `GET /students/exams`: lista los exámenes del estudiante autenticado.
- `GET /students/exams/{exam_id}/qr`: obtiene la imagen del QR de ese examen.

`VITE_API_URL` debe incluir `/api/v1`, como indica el README. La feature no agrega
ese prefijo ni envía un `student_id`. Los tipos de respuesta están en
`types/studentQr.ts` y corresponden al contrato actualizado de HU11.

`useStudentExams` carga la lista, expone carga/error/datos y permite reintentar.
`useStudentQr` solicita el QR al seleccionar un examen; limpia el resultado
anterior y cancela solicitudes al cambiar de examen, cerrar el QR o desmontar
la página. Las respuestas de solicitudes canceladas no actualizan la interfaz.
También rechaza una respuesta cuyo `exam_id` no coincide con el solicitado.

La disponibilidad visual usa exclusivamente `is_qr_available`. Un 403 elimina
el QR y muestra el mensaje del backend como texto; ofrece actualizar la lista.
No se calcula autorización con el reloj del navegador. Los errores 401, 404,
de servidor y de red tienen mensajes legibles, sin exponer detalles técnicos.

La imagen se muestra directamente con `qr_code_base64`. El token no se muestra,
transforma ni persiste en almacenamiento del navegador. La descarga usa la misma
imagen SVG y un nombre saneado con materia, examen e ID de examen para distinguir
evaluaciones, por ejemplo `qr-base-de-datos-i-primer-parcial-10.svg`.
No hay generación de QR ni conversión a PNG. Si se requiere PNG en el futuro,
será necesario solicitarlo al backend o implementar una conversión con canvas.

La fecha del contrato (`YYYY-MM-DD HH:mm:ss`) no incluye zona horaria: se muestra
como hora local programada, sin añadir ni inferir un desplazamiento UTC.

## Dependencias pendientes

En la inspección del repositorio hermano, `routes/api/v1.php` todavía expone
`/students/{student}/subjects/{subject}/qr`. Su recurso devuelve un token y
metadatos del estudiante, sin la imagen `qr_code_base64`. No están implementados
allí los dos endpoints del contrato actualizado. Por ello el flujo real requiere
que backend publique ese contrato; el frontend no usa el endpoint antiguo.

Las carpetas de autenticación y `StudentLayout` del frontend contienen solamente
`.gitkeep`; no existen login, sesión, interceptores ni guards reutilizables.
El cliente compartido actualmente configura `baseURL` y `Accept`, sin habilitar
credenciales entre orígenes. El backend local tampoco configura rutas protegidas
con Sanctum ni middleware de SPA con sesión. No se presume un mecanismo de
autenticación: queda pendiente integrar el mecanismo acordado en la feature de
autenticación y el cliente compartido, además de los guards cuando existan.
La ruta de UI no sustituye la autorización del backend.

No se modificó el backend ni se agregaron dependencias.

## Validación funcional con el contrato actualizado

Validación ejecutada durante la implementación:

- `npm run build`: correcto (TypeScript y compilación de producción con Vite).
- `npm run lint`: correcto, sin errores.
- Prettier aplicado únicamente a los archivos de esta implementación.
- `git diff --check`: sin errores de espacios en los cambios rastreados.

El repositorio no tiene un script de tests ni una suite de pruebas configurada.
Además de `npm run build` y `npm run lint`, validar con backend actualizado o
respuestas controladas:

1. Lista con dos evaluaciones de una materia y otra de una materia distinta:
   comprobar materia, título, fecha/hora y acciones según `is_qr_available`.
2. Lista vacía, carga lenta y fallo de red: comprobar mensajes y reintento.
3. Obtener un QR disponible: comprobar imagen, contexto del examen y descarga
   `.svg`; el contenido descargado debe ser el SVG recibido.
4. Seleccionar A y después B mientras A sigue pendiente: una respuesta tardía de
   A no debe reemplazar el QR de B. Cerrar o actualizar debe cancelar la petición.
5. Responder 403 aunque la lista indique disponibilidad: debe desaparecer
   cualquier QR anterior y mostrarse el mensaje del backend sin descarga.
6. Responder 401, 404, 500 y error de red: comprobar mensajes legibles. Reintentar
   después de recuperar el servicio debe permitir continuar.
7. Probar SVG inválido: comprobar mensaje de fallo de imagen sin enlace de descarga.
8. Revisar anchos de 320, 768 y 1280 px, navegación con teclado y QR cuadrado.

Estas comprobaciones funcionales no equivalen a una validación de extremo a
extremo contra el backend local, que todavía no ofrece el contrato requerido.
