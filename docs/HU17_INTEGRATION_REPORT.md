# HU17 Integración con backend

Fecha: 8 de octubre de 2026.

## Ramas y alcance

- Frontend: `Dev_Chalco`.
- Backend consultado: `Dev_Oli`.
- No se modificaron archivos del repositorio backend ni se crearon commits.
- No se aplicaron migraciones ni escrituras en la base compartida.

## Compatibilidad y ajustes

Las siete rutas administrativas, sus payloads JSON/multipart, respuestas `data` y metadatos coinciden con el cliente de aulas existente. No hizo falta sustituir ese cliente ni añadir simulaciones.

Se integró la consulta docente `GET /rooms` con `exam_date`, `start_time` y `duration_minutes` para completar la disponibilidad de HU17. El selector espera un horario completo, cancela consultas anteriores, limpia la selección al cambiar el horario y bloquea el guardado hasta seleccionar un aula disponible. El backend sigue validando nuevamente al registrar el examen.

Los cambios del selector corresponden a creación de exámenes y disponibilidad; no implementan edición/cancelación de HU18.

Backend aplica unicidad global al nombre del aula, además del código. El frontend presenta los errores por campo que devuelve esa regla.

## Pruebas reales

Se ejecutó el frontend normal contra la aplicación Laravel de `Dev_Oli`, con cookies, CSRF y rutas reales. Se usó una base SQLite separada, creada exclusivamente para estas pruebas, y configuración local temporal fuera de ambos repositorios. No se utilizaron respuestas API simuladas.

- Inicio de sesión administrativo y docente.
- Registro manual y consulta posterior del aula.
- Edición persistida, capacidad y descripción.
- Rechazo de código duplicado con mensaje por campo.
- Desactivación y activación persistidas.
- CSV mixto: tres filas, una importada y dos rechazadas.
- Doble clic en confirmación: una sola aula insertada.
- Reporte final almacenado y detalle de aula importada con capacidad y piso.
- Fila de capacidad cero no insertada.
- Selector docente excluye aula inactiva y aula con reserva que solapa el horario.
- Reserva previa de 10:00 a 11:30; consulta a las 11:00 excluye esa aula, consulta a las 11:30 la incluye.
- Cambio de horario limpia la selección anterior.
- Registro efectivo de un examen a las 11:30 en esa aula, verificado en la base aislada.
- Formulario sin horario completo muestra instrucciones y bloquea el guardado.
- Sesión reemplazada en la base aislada: el navegador con cookies reales termina en el login.

## Suite del backend recibida

Comando: `php artisan test --compact tests/Feature/Rooms`.

Resultado: 39 pruebas aprobadas, 1 fallida y 2 omitidas; 351 aserciones.

La prueba fallida es `RoomCatalogTest::test_first_access_and_replaced_session_are_rejected`, línea 111: esperaba `401 SESSION_REPLACED` y recibió `200`. No se modificó backend ni se omitió artificialmente esta prueba. El compañero backend debe revisar si el problema está en la preparación de sesión del test o en el middleware.

Las dos pruebas omitidas necesitan una base PostgreSQL de concurrencia dedicada. La verificación sobre SQLite no certifica los bloqueos concurrentes de PostgreSQL.

## Límites

Esta revisión no certifica la configuración CORS/cookies del despliegue ni migraciones aplicadas en producción. En el entorno de pruebas se habilitó el origen local y una sesión dedicada. El frontend conserva su configuración habitual de entorno.

La compilación TypeScript/Vite, el lint global y `git diff --check` finalizaron correctamente después de los ajustes. Se detuvieron los servidores de prueba y se retiró su base temporal.

Algunas validaciones CSV del servidor devuelven mensajes en inglés; son mostrados fielmente en el reporte. La traducción de validaciones Laravel corresponde al backend.
