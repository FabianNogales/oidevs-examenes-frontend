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
`useStudentQr` utiliza el QR incluido en el examen si el contrato ya devuelve
imagen y token; en caso contrario lo solicita por `exam_id`. Limpia el resultado
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

## Presentación y selección

La regla es **1 estudiante + 1 examen = 1 QR único**. El encabezado «Mis exámenes»
precede al panel de exámenes programados y a la sección «Tu QR de ingreso».
Las tarjetas son horizontales en escritorio, se reorganizan en tablet y son
verticales en móvil, con acciones de ancho completo. La selección se distingue
con borde carmesí y la etiqueta «Seleccionado», además de `aria-pressed`.

La pantalla conserva Poppins y los colores institucionales, con paneles blancos,
decoración celeste y rosada, bordes suaves y foco visible. El QR se centra sobre
fondo blanco y conserva la proporción cuadrada y la descarga del SVG original.
El mockup se utiliza como referencia visual: no se agregan duración, aula,
docente, cuenta regresiva ni estados que el contrato no proporciona, ni ficha PDF.

«Ver QR» solo se habilita con `is_qr_available`. El contrato actual no incluye
un mensaje individual de disponibilidad en la lista; se conserva el texto
«Disponible 24 h antes del examen». No se calcula disponibilidad con fechas.
Al seleccionar se desplaza la vista hasta la sección inferior con scroll suave;
con `prefers-reduced-motion: reduce` el desplazamiento es inmediato. Se reserva
margen para el Header fijo. Seleccionar otro examen sustituye el resultado;
«Cerrar QR» limpia el estado local y cancela la solicitud sin modificar el token
en el servidor.

## Integración y dependencias

La rama `integration/hu11-auth` incluye `AuthProvider`, `AppLayout`,
`StudentLayout`, Header y Footer institucionales y el login temporal de
`b6eb9d6`. El cliente compartido tiene `withCredentials: true`. El rediseño
conserva estas integraciones sin modificar autenticación, rutas, hooks ni cliente
HTTP. En este estado del repositorio no existe un componente `ProtectedRoute`;
el rediseño no agrega guards. La ruta de UI no sustituye la autorización del backend.

El flujo real requiere que el backend ofrezca los endpoints del contrato y la
sesión integrada. Su disponibilidad no se ha comprobado durante el rediseño;
no se utiliza el endpoint antiguo por materia.

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
9. Seleccionar un examen disponible y comprobar el scroll hacia «Tu QR de ingreso»;
   repetir con movimiento reducido activado y verificar desplazamiento inmediato.
10. Cerrar el QR: debe volver el estado sin selección, sin petición de modificación
    del token. Verificar que el token no se muestra ni se guarda en localStorage
    o sessionStorage.

La lista anterior es una guía de comprobación manual; lint y build no equivalen
a una validación de extremo a extremo contra el backend ni a una prueba de
escaneo del QR en un dispositivo físico.
