# HU17 — Contrato de integración de aulas

## Alcance y estado

Frontend implementado: catálogo, búsqueda, filtro de estado, paginación, detalle por ID, registro, edición, activación/desactivación e importación CSV con vista previa y reporte final.

Rutas: `/admin/rooms` y `/admin/rooms/import`. Se reutilizan el layout, header, footer, Poppins, tokens globales y los estilos del CSV de estudiantes. Los archivos de estudiantes no fueron modificados. Las páginas de aulas se cargan por separado.

**No se implementó ni modificó backend.** Las pruebas de interacción utilizaron respuestas simuladas; no certifican persistencia, reglas de base de datos ni disponibilidad real por horario.

## Convenciones

- Rutas relativas a la API existente `/api/v1`.
- Sesión Sanctum/Fortify, cookies y CSRF existentes. No agregar bearer tokens al frontend.
- Todos los endpoints administrativos requieren `ADMINISTRADOR` activo. Responder `401` sin sesión y `403` sin permisos.
- Respuestas JSON con `data`; identificadores y contadores como números, no cadenas.
- Los errores por campo usan `{ "message": "...", "errors": { "code": ["..."] } }`.
- Las fechas y horas de examen deben representar la hora institucional de `America/La_Paz`. `expires_at` usa ISO 8601 con zona horaria.

## 1. Modelo de aula

```json
{
  "id": 12,
  "code": "A-01",
  "name": "Aula 690-A",
  "location": "Edificio nuevo – PB",
  "description": "Aula para exámenes",
  "capacity": 50,
  "floor": "PB",
  "status": "ACTIVE",
  "availability": "AVAILABLE",
  "current_exam": null
}
```

| Campo          | Contrato usado por frontend                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| `id`           | Entero positivo, identidad permanente del aula.                                                              |
| `code`         | Obligatorio; cadena de hasta 255 caracteres, recortada en los extremos. Única también entre aulas inactivas. |
| `name`         | Obligatorio en los formularios nuevos; máximo 255. Los registros históricos nulos pueden consultarse.        |
| `location`     | Opcional; cadena hasta 255 o `null`.                                                                         |
| `description`  | Opcional; cadena hasta 1000 o `null`; permite varias líneas.                                                 |
| `capacity`     | Opcional; entero positivo hasta 2147483647 o `null`. No aceptar decimales, cero o negativos.                 |
| `floor`        | Opcional; cadena hasta 50 o `null`; admite valores como `PB`, `1`, `Sótano`.                                 |
| `status`       | Exclusivamente `ACTIVE` o `INACTIVE`.                                                                        |
| `availability` | `AVAILABLE`, `OCCUPIED` o `UNKNOWN`; independiente del estado administrativo.                                |
| `current_exam` | Objeto de examen en curso o `null` cuando se confirmó que no hay uno.                                        |

`description`, `capacity` y `floor` no están en el SQL recibido: backend necesita añadir soporte o acordar cambios al contrato antes de integrar. La vista tolera su ausencia; el formulario sí los envía.

Cuando backend todavía no pueda calcular disponibilidad, enviar `UNKNOWN` u omitir `availability`. El frontend muestra **Sin información**, sin inferir que el aula está libre. Omitir `current_exam` también significa información desconocida, no ausencia confirmada.

Examen en curso:

```json
{
  "id": 73,
  "name": "Elementos de Programación",
  "exam_date": "2026-10-08",
  "start_time": "09:45:00",
  "end_time": "11:15:00"
}
```

## 2. Listado

`GET /admin/rooms?page=1&per_page=15&search=A-01&status=ACTIVE`

- `search`: opcional; buscar por código o nombre, sin distinguir mayúsculas.
- `status`: opcional; al omitirlo devolver activos e inactivos.
- Orden estable y paginación en servidor. No reutilizar el endpoint docente que devuelve solo aulas activas.
- Calcular `availability` y `current_exam` para el momento de la consulta, sin confundir actividad con ocupación.

```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 0,
    "from": null,
    "to": null
  }
}
```

En un resultado no vacío, `from` y `to` contienen los límites reales. Responder `200` con lista vacía cuando no hay registros o coincidencias, no `404`.

## 3. Detalle, registro y edición

| Método | Endpoint            | Respuesta                                                          |
| ------ | ------------------- | ------------------------------------------------------------------ |
| GET    | `/admin/rooms/{id}` | `200 { "data": aula }` o `404`.                                    |
| POST   | `/admin/rooms`      | `201 { "data": aula }`, con ID generado y estado inicial `ACTIVE`. |
| PUT    | `/admin/rooms/{id}` | `200 { "data": aula }`, conservando ID y estado.                   |

Payload de POST/PUT:

```json
{
  "code": "A-01",
  "name": "Aula 690-A",
  "location": "Edificio nuevo – PB",
  "description": "Aula para exámenes",
  "capacity": 50,
  "floor": "PB"
}
```

- Opcionales vacíos se envían como `null` para permitir borrar un valor al editar.
- El frontend no envía `status`, `availability` ni exámenes en estas operaciones.
- Repetir validaciones en servidor; no confiar en las validaciones del navegador.
- Rechazar caracteres de control; código, nombre, ubicación y piso son de una sola línea.
- Resolver duplicados bajo concurrencia con restricciones de base de datos y devolver errores legibles por campo, sin crear registros parciales.
- `errors.code` para código duplicado, incluyendo al editar. Excluir el propio ID de la comprobación de unicidad.
- CA5 condiciona la unicidad del nombre a las reglas del sistema: el equipo debe definir su alcance, por ejemplo global o por ubicación. Cuando aplique, devolver `errors.name`. No se inventó una comprobación de unicidad local.
- Un ID inexistente o una respuesta con un ID diferente no habilita una edición exitosa.

## 4. Cambio de estado

`PATCH /admin/rooms/{id}/status`

```json
{ "status": "INACTIVE" }
```

Responder `200 { "data": aula }` con el mismo ID y el estado solicitado. La operación debe ser idempotente: solicitar el estado que ya existe no debe alterar relaciones ni crear efectos repetidos.

- Cambiar únicamente el estado administrativo; conservar exámenes, entradas, referencias e historial.
- No implementar desactivación mediante eliminación física ni cascadas.
- `404` para ID inexistente; `422` para estado inválido.
- Si existe una restricción de negocio, devolver `409` con `message` explicando el motivo. El frontend mantiene la confirmación abierta y no simula un cambio exitoso.
- No se asumió que tener historial impide desactivar. Una restricción sobre exámenes en curso debe definirse expresamente.
- No hay botón de eliminación física. Si backend expone esa operación, debe impedirla cuando existen registros relacionados (CA15).

## 5. CSV y plantilla

Archivo UTF-8, separador coma, máximo **10 MB**, encabezados en este orden:

```csv
codigo,nombre,descripcion,capacidad,piso
```

- Se admiten BOM, encabezados entre comillas, espacios alrededor del encabezado y diferencias de mayúsculas.
- Todas las columnas deben existir. Solo los valores de `codigo` y `nombre` son obligatorios.
- `descripcion`, `capacidad` y `piso` vacíos son opcionales.
- Interpretar comillas, comas dentro de celdas, comillas escapadas y saltos de línea dentro de descripción con un parser CSV real.
- La plantilla descargada contiene únicamente encabezados; no crea aulas de ejemplo ni depende de seeders.
- CSV no incluye `location` ni `status`: el aula nueva queda activa; ubicación puede completarse mediante edición.
- No actualizar ni reactivar automáticamente un aula cuyo código ya exista. Reportarla como observación.

### Vista previa

`POST /admin/rooms/import/preview`, multipart/form-data con `file`.

**No escribir aulas durante la vista previa.** Validar archivo, campos, formatos y duplicados dentro del archivo y contra la base de datos. Retornar los valores de cada fila en claves internas inglesas, siempre como cadenas.

```json
{
  "data": {
    "preview_id": "identificador-opaco-del-servidor",
    "expires_at": "2026-10-08T17:30:00-04:00",
    "total_rows": 2,
    "valid_rows": 1,
    "error_rows": 1,
    "errors": [],
    "rows": [
      {
        "row": 2,
        "data": {
          "code": "A-10",
          "name": "Aula 710",
          "description": "",
          "capacity": "50",
          "floor": "PB"
        },
        "valid": true,
        "errors": []
      },
      {
        "row": 3,
        "data": {
          "code": "A-01",
          "name": "Aula 690",
          "description": "",
          "capacity": "50",
          "floor": "1"
        },
        "valid": false,
        "errors": ["El código ya está registrado."]
      }
    ]
  }
}
```

- `row`: número de fila de origen, entero >= 2 y único dentro del reporte. Mantenerlo en la confirmación.
- Filas válidas tienen `errors: []`; inválidas tienen al menos una observación.
- `errors` del nivel de archivo representa problemas generales que impiden confirmar, incluso si hay filas aparentemente válidas.
- `total_rows = rows.length = valid_rows + error_rows`; los contadores deben coincidir con `rows[].valid`.
- Se requieren todas las filas en la respuesta; la tabla del frontend las pagina de 20 en 20 y permite filtrarlas.
- Asociar `preview_id` al administrador, archivo y vencimiento; debe ser opaco y verificable en servidor.

### Confirmación

`POST /admin/rooms/import/confirm`, multipart/form-data con:

- `file`: el mismo archivo de la vista previa.
- `preview_id`: el mismo identificador devuelto por preview.

Revalidar usuario, archivo, vencimiento y conflictos actuales; registrar únicamente las filas que sigan siendo válidas. No confiar en filas o contadores enviados por el navegador. Cada registro debe persistirse íntegro.

```json
{
  "data": {
    "total_rows": 2,
    "valid_rows": 1,
    "error_rows": 1,
    "imported_rows": 1,
    "failed_rows": 1,
    "errors": [],
    "rows": [
      {
        "row": 2,
        "data": {
          "code": "A-10",
          "name": "Aula 710",
          "description": "",
          "capacity": "50",
          "floor": "PB"
        },
        "valid": true,
        "errors": []
      },
      {
        "row": 3,
        "data": {
          "code": "A-01",
          "name": "Aula 690",
          "description": "",
          "capacity": "50",
          "floor": "1"
        },
        "valid": false,
        "errors": ["El código ya está registrado."]
      }
    ]
  }
}
```

En el reporte final, `valid: true` significa **importada efectivamente**; `valid_rows = imported_rows` y `error_rows = failed_rows`. No devolver solo el número importado: la pantalla muestra resultados y observaciones por aula.

**Idempotencia obligatoria para los reintentos:** bloquear la confirmación por `preview_id` y almacenar su resultado. Una segunda confirmación del mismo identificador devuelve el reporte almacenado, sin volver a insertar. Verificar primero si ya fue completada y conservar el resultado para recuperar una respuesta perdida, incluso si venció el plazo original de preview. El frontend conserva el identificador cuando hay un error de conexión.

Si la vista previa venció sin completarse o no corresponde al archivo, responder `409`/`410` sin escribir filas; el frontend solicita nueva validación. Si falta autorización, `403`; archivo demasiado grande, `413`; estructura inválida, `422` con mensaje legible. No utilizar `409` para una confirmación ya completada que puede devolver su resultado.

## 6. Disponibilidad para programación de exámenes — dependencia CA13

El endpoint docente de aulas debe excluir inactivas y aulas con solapamientos **para la fecha y horario solicitados**, no solo calcular ocupación al momento actual. Propuesta compatible con la ruta existente:

`GET /rooms?exam_date=2026-10-11&start_time=09:45&duration_minutes=90`

- Intervalos `[inicio, fin)`: puede iniciar otro examen cuando termina el anterior.
- Considerar estados de examen que reservan el aula; un examen cancelado no debe bloquearla.
- Validar también el solapamiento y estado activo al guardar el examen, para evitar carreras entre consulta y registro.
- Mantener relaciones históricas aunque el aula se desactive.

**La pantalla docente actual consulta aulas sin enviar fecha/horario.** Su selector necesitará coordinar estos parámetros al integrar esta regla. No se modificó el módulo docente en HU17, conforme al alcance autorizado. La disponibilidad de la tabla administrativa no sustituye esta consulta.

## 7. Cobertura de los 16 criterios detallados

| CA  | Frontend implementado                                               | Validación pendiente en backend                              |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Registro y resultado confirmado por API.                            | Validar y persistir aula.                                    |
| 2   | Código/nombre obligatorios; no enviar formulario vacío.             | Rechazo de campos obligatorios faltantes.                    |
| 3   | Longitudes, formato, capacidad y mensajes por campo.                | Repetir reglas y rechazar formatos inválidos.                |
| 4   | Presentar `errors.code`; no simular registro exitoso.               | Unicidad bajo concurrencia.                                  |
| 5   | Presentar `errors.name`.                                            | Definir y aplicar alcance de unicidad del nombre.            |
| 6   | Lista, búsqueda, filtro, paginación, vacío y error.                 | Devolver registros reales y metadatos.                       |
| 7   | Consultar detalle mediante ID.                                      | Devolver solo el aula solicitada.                            |
| 8   | Manejar `404`, bloquear edición de ID inexistente.                  | Rechazar consulta/modificación/estado inexistentes.          |
| 9   | Edición precargada, guardado y recarga del listado.                 | Persistir cambios sin alterar ID ni relaciones.              |
| 10  | Mostrar errores de código en edición.                               | Unicidad excluyendo el propio ID.                            |
| 11  | Confirmación de activación y refresco por respuesta.                | Persistir `ACTIVE`.                                          |
| 12  | Confirmación de desactivación y refresco por respuesta.             | Persistir `INACTIVE`.                                        |
| 13  | Estado y disponibilidad diferenciados en administración.            | Filtro real por horario y coordinación del selector docente. |
| 14  | Cambio de estado sin eliminación; mostrar examen asociado.          | Mantener relaciones e historial.                             |
| 15  | No se ofrece eliminación física.                                    | Impedir borrado de aulas relacionadas.                       |
| 16  | Registro/importación mediante API; sin datos productivos simulados. | Persistencia real y consulta posterior sin seeders.          |

## 8. Verificación realizada

- Compilación TypeScript/Vite y lint global del frontend.
- Pruebas locales de validación de formulario y archivo CSV.
- Interacciones en navegador con router, AuthProvider, permisos, header y footer reales; respuestas API simuladas temporalmente.
- Registro, detalle, edición, duplicados, 404/500 y respuestas con ID incorrecto en las partes 1 y 2.
- Cambio de estado, cancelación sin envío, envío único, rechazo de restricciones y conservación visual del examen asociado.
- Archivo con encabezados incorrectos rechazado sin enviar preview.
- Vista previa mixta y confirmación única: una importada y dos observadas.
- Reintento con respuesta perdida: dos solicitudes con el mismo ID y una sola fila importada en el servidor simulado.
- Vista vencida: nueva validación; cero importaciones.
- Cero filas válidas: confirmación deshabilitada.
- Paginación de 45 filas en tres páginas y filtro sin resultados.
- Responsive de listado/formulario/reporte a 320 y 375 px; revisión de escritorio.
- Docente redirigido fuera de administración; usuario sin sesión redirigido al login.

Los archivos de prueba temporales se retiran antes de entregar. La prueba de aceptación contra la base de datos deberá realizarse cuando estén disponibles estos endpoints.
