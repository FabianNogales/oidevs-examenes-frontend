# HU23 — Contrato de gestión de materias

Contrato propuesto para acordar frontend/backend. No confirma endpoints implementados.
Fuente: tablas detalladas del backlog, páginas 43–44 (CA1–30); mockup CSV como requisito adicional.
Base: `/api/v1`, sesión Sanctum y CSRF como HU17. Todos estos endpoints requieren usuario activo,
rol ADMINISTRADOR, sesión vigente y contraseña inicial cambiada. No cambiar las rutas docentes existentes.

## Modelo y reglas

- `subjects`: conservar IDs, código, nombre, estado y relaciones actuales.
- `career_subject`: relación muchos a muchos, pareja única, claves foráneas restrictivas.
- Estado exclusivamente `ACTIVE` / `INACTIVE`. No modelar disponibilidad/ocupación.
- Código global único, también entre materias inactivas. Normalizar código a mayúsculas y recortar extremos.
- Propuesta de validación común: código obligatorio 1–50 caracteres ASCII `[A-Z0-9][A-Z0-9._-]*`;
  nombre obligatorio 2–255 caracteres, al menos una letra Unicode, sin caracteres de control.
  Permitir tildes, números y puntuación académica. El backlog no fija estos límites: acordarlos antes de integrar.
- Registro manual: al menos una carrera activa existente, IDs enteros distintos.
- Edición: permitir mantener carreras históricas inactivas ya asociadas; no agregar carreras inactivas nuevas.
  Eliminar una asociación del catálogo no debe eliminar carreras, materias, ofertas ni historial.
- Código/nombre/carreras se editan juntos en transacción; estado mediante endpoint separado.
- No aceptar IDs, estado u otros campos protegidos en el payload de registro/edición.
- Crear con estado ACTIVE. No reactivar automáticamente una materia existente al importar.
- No exigir datos de seeders ni ocultar materias antiguas sin carreras: devolver `careers: []`.
- Nombre no tiene unicidad global: distintas materias pueden compartir nombre.

## Representación

```json
{
  "data": {
    "id": 12,
    "code": "INF-01",
    "name": "Programación I",
    "status": "ACTIVE",
    "careers": [
      {
        "id": 2,
        "code": "SIS",
        "name": "Ingeniería de Sistemas",
        "status": "ACTIVE"
      }
    ]
  }
}
```

IDs numéricos, arrays siempre presentes. No devolver contraseñas ni información de usuarios.

## Endpoints

| Método | Ruta                             | Resultado                                       |
| ------ | -------------------------------- | ----------------------------------------------- |
| GET    | `/admin/subjects`                | Catálogo paginado, 200                          |
| GET    | `/admin/subjects/careers`        | Todas las carreras para filtros/formulario, 200 |
| GET    | `/admin/subjects/{id}`           | Materia concreta, 200/404                       |
| POST   | `/admin/subjects`                | Crear, 201 con representación completa          |
| PUT    | `/admin/subjects/{id}`           | Editar, 200 con representación completa         |
| PATCH  | `/admin/subjects/{id}/status`    | Cambiar estado, 200 con representación completa |
| POST   | `/admin/subjects/import/preview` | Validar CSV sin modificar catálogo, 200         |
| POST   | `/admin/subjects/import/confirm` | Confirmar importación, 200                      |

Registrar rutas estáticas careers/import antes del parámetro `{id}`.
No se ofrece borrado físico en frontend. Si hay otro endpoint DELETE, impedir el borrado con ofertas relacionadas.

### Catálogo y carreras

Query: `page` positivo, `per_page=15` (máximo 100), `search` opcional máximo150,
`status` opcional ACTIVE/INACTIVE, `career_id` opcional entero positivo existente.
Combinar filtros con AND; buscar código/nombre sin distinguir mayúsculas, escapar comodines SQL.
Orden estable por ID (documentar sentido). Evitar materias repetidas por el join con carreras.
Página fuera de rango: ajustar a última página válida y devolver esa página en meta.

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

`GET /admin/subjects/careers`: `{"data":[{"id":2,"code":"SIS","name":"Ingeniería de Sistemas","status":"ACTIVE"}]}`.
Sin paginación, orden nombre/ID, incluir inactivas para historial/filtros. Formulario solo ofrece nuevas asociaciones activas.

### Escritura manual

POST/PUT: `{"code":"INF-01","name":"Programación I","career_ids":[2,3]}`.
PATCH estado: `{"status":"INACTIVE"}` o ACTIVE; repetir el estado debe ser seguro.
Validar también en backend; restricción única DB y manejo de carreras eliminadas/desactivadas concurrentemente.
No perder carreras históricas por ignorar IDs del formulario. Devolver toda la representación tras guardar.

### Errores

401 sesión ausente/vencida/reemplazada (mantener códigos de autenticación actuales);
403 rol/usuario no autorizado; 404 ID inexistente; 422 campos inválidos/duplicados;
409 preview incompatible o conflicto de operación; 410 preview vencido; 413 archivo demasiado grande;
500 error interno sin filtrar SQL/datos sensibles.

```json
{
  "message": "Revisa los campos indicados.",
  "errors": {
    "code": ["Ya existe una materia con este código."],
    "career_ids": ["Selecciona al menos una carrera activa."]
  }
}
```

Claves `code`, `name`, `career_ids` (aceptar también errores indexados `career_ids.0`), `status`, `file`, `preview_id`.
Mensajes legibles en español; no convertir un fallo en un éxito vacío.

## CSV: decisiones de integración

Formato UTF-8, BOM opcional, coma, encabezado exacto:
`codigo_materia,nombre_materia,codigo_carrera`. Máximo10MB; archivo no vacío; parser CSV real con comillas.
Una fila por materia/carrera; repetir código con mismo nombre para varias carreras es válido.
Carrera resuelta por código, existente y activa; no crear entidades implícitamente.

Política propuesta: código nuevo crea materia ACTIVE y asociaciones válidas; código existente con mismo nombre
agrega únicamente asociaciones faltantes. Código existente con nombre diferente o materia inactiva: error,
sin renombrar/reactivar. Pareja ya asociada/duplicada en archivo: OMITTED, sin doble inserción.
Comparar nombres tras trim (sin cambios implícitos de tildes/puntuación).
Si un mismo código aparece con nombres diferentes, marcar todas sus filas ERROR para evitar elegir arbitrariamente.
Estos casos no están detallados en el backlog y requieren acuerdo del backend.

Preview multipart: `file`. Confirm multipart: mismo `file` + `preview_id`.
Guardar preview por usuario/hash SHA256, expira30min. Confirmar solo preview válido, propio y con archivo idéntico.
Revalidar referencias/duplicados al confirmar. Importación parcial por filas válidas, transacción por materia
y sus asociaciones; nunca crear una materia huérfana de una fila rechazada.
Informe y cambios confirmados atómicamente. Bloquear preview concurrente; misma confirmación devuelve
el mismo resultado incluso tras vencimiento si ya completó. No usar `room_imports` ni aceptar previews de otro módulo.

Respuesta preview:

```json
{
  "data": {
    "preview_id": "UUID",
    "expires_at": "2026-10-08T20:00:00Z",
    "summary": { "total": 3, "valid": 1, "invalid": 1, "omitted": 1 },
    "rows": [
      {
        "row_number": 2,
        "data": {
          "codigo_materia": "INF-01",
          "nombre_materia": "Programación I",
          "codigo_carrera": "SIS"
        },
        "status": "VALID",
        "errors": []
      }
    ]
  }
}
```

Ejemplo de rows abreviado; en una respuesta real deben venir las3 filas y cuadrar summary.
Estados preview VALID/ERROR/OMITTED; confirm IMPORTED/ERROR/OMITTED.
Confirm: mismo preview_id, `summary: {total,imported,failed,omitted}`, todas las filas con datos originales,
errors array de strings, `subject_id` numérico para IMPORTED. `imported` cuenta filas/asociaciones procesadas,
no materias distintas. Conservar numeración física del CSV, permitir filtrar/paginar informe en frontend.
Si no hay filas VALID no permitir confirmación. Confirmar con dobles clics/reintentos no duplica registros.

## Garantías y criterios

| CA    | Cobertura requerida                                                                    |
| ----- | -------------------------------------------------------------------------------------- |
| 1,21  | POST válido persiste materia y carreras; formulario y confirmación de éxito            |
| 2,22  | Obligatorios en cliente y backend                                                      |
| 3,23  | Formato/longitud; validación de CSV y escritura                                        |
| 4,24  | Código único en DB incluyendo carreras compartidas e inactivas                         |
| 5,25  | Regla de nombre común documentada arriba                                               |
| 6,26  | Catálogo paginado sin depender de seeders                                              |
| 7,27  | GET ID y detalle frontend, verificar ID de respuesta                                   |
| 8,28  | 404 en consulta/edición de registro inexistente                                        |
| 9,29  | PUT valida y persiste; detalle fresco antes de editar                                  |
| 10,30 | Código de otra materia se rechaza al editar, error por campo                           |
| 11    | PATCH de estado y recarga del catálogo                                                 |
| 12    | Servicios de creación de ofertas solo aceptan materias ACTIVE; aplicar también HU19    |
| 13,19 | Estado no modifica/borrar ofertas, exámenes, inscripciones o consultas históricas      |
| 14    | Restricciones FK y protección backend frente a borrado físico                          |
| 15    | Alta funciona sobre catálogo vacío con carreras reales existentes                      |
| 16    | Transacciones y rollback completo de operaciones fallidas                              |
| 17,18 | Middleware y autorización de cada ID en servidor; navegación frontend admin únicamente |
| 20    | Auditoría de altas, cambios y estado, actor/ID/antes/después en transacción            |

No declarar CA backend cumplidos solo por ocultar controles en frontend. Probar en BD aislada:
duplicados concurrentes, campos ausentes, nombre inválido, cambio código duplicado,404,roles ajenos,
oferta con materia inactiva, historial tras desactivar, rollback, auditoría, CSV parcial e idempotencia.
Preservar módulos HU17/HU18 y rutas docentes existentes. No ejecutar migraciones en BD compartida sin revisión.

## Entregas frontend

1. Catálogo, filtros, navegación admin, estados de carga/error/vacío y este contrato.
2. Registro, detalle, edición y cambio de estado con prevención de doble envío.
3. CSV preview/confirmación/informe, responsive y revisión de conjunto.

Contrato propuesto desde parte1; las pruebas de integración real requieren endpoints disponibles y acuerdo de las políticas CSV.
