# HU12: gestión de habilitaciones del examen

Frontend en `Dev_Erick`, actualizado al contrato definitivo proporcionado por el
usuario. Se reutilizan AppLayout, ExamCard, estilos docentes, tokens globales,
Snackbar y el contenedor de modal existente. Los cambios se limitan a HU12.

## Contrato definitivo

- GET `/api/v1/exams/{exam_id}/eligibilities`: carga la lista completa de `data`.
- GET `/api/v1/exams/{exam_id}/eligibilities/reasons`: catálogo de `{ code, label }`.
- PATCH `/api/v1/exams/{exam_id}/eligibilities/{student_id}`: identifica al estudiante,
  no al registro de habilitación.
- Habilitar: `{ status: 'ELIGIBLE' }`. Backend limpia motivo y observaciones.
- Inhabilitar: `{ status: 'INELIGIBLE', reason_code: codigoSeleccionado, observations: texto }`.
- POST `/api/v1/exams/{exam_id}/eligibilities/bulk`: `FormData` con campo `file`.
  El navegador establece `multipart/form-data` y su boundary.

No se envía `reason` libre en nuevas modificaciones, ni se inventan códigos,
opciones o respuestas. El selector muestra `label`; `code` se usa internamente.
Tras PATCH exitoso se cierra el modal, aparece el Snackbar y se recarga el GET
oficial para actualizar estados, motivos y contadores.

## Gestión individual y lectura histórica

El modal mantiene nombre completo, SIS, CI y tarjetas de estado con radios reales.
Habilitado oculta los campos de inhabilitación y no los envía al guardar.
Inhabilitado requiere un motivo del catálogo y permite observaciones opcionales,
con `maxLength=500`, contador visible y protección adicional antes de enviar.

El GET normaliza campos nuevos ausentes a `null` para leer respuestas anteriores.
La tabla sigue mostrando `reason`, con dos líneas y el texto completo en `title`.
Un registro con `reason_code: null` y `reason` histórico muestra ese texto completo
en una sección de lectura del modal. No se deduce ningún código; se debe elegir
un motivo actual para guardar una nueva inhabilitación. Si un código anterior ya
no pertenece al catálogo, también se exige una selección actual.

El catálogo tiene carga, error y reintento; si no está disponible o está vacío no
se puede guardar una inhabilitación. Se puede habilitar con el payload de estado
sin depender del catálogo. Guardar queda bloqueado durante envío, sin cambios,
sin motivo válido o con observaciones superiores al límite. Cancelar no envía PATCH.

## Carga masiva

«Cargar habilitaciones» abre un modal con selector `.csv`, Cancelar y Procesar.
Informa CSV UTF-8 separado por comas, máximo 5 MB y 1.000 registros, y encabezados
obligatorios `sis_code,status,reason_code,observations`.

Frontend verifica únicamente archivo presente, extensión y tamaño (5 × 1024 × 1024
bytes). Se envía el archivo original; no se parsea CSV, no se convierte SIS a número
ni se validan encabezados, codificación, filas o reglas académicas localmente.
Backend valida formato, límites, códigos, SIS, pertenencia y autorización.

Un 200 muestra siempre el resumen real `total_rows`, `updated_rows`, `failed_rows`
y los errores por Línea, SIS y mensajes. `row` se muestra sin sumar ni restar:
el encabezado cuenta como línea 1. Una respuesta parcial conserva tanto las
actualizaciones como las filas rechazadas; no se trata como fallo global.
Si `updated_rows > 0`, se recarga GET y se recalculan los contadores. El resumen
permanece abierto para revisión, y el mismo resultado no se vuelve a enviar sin
seleccionar un archivo. Si no hay actualizaciones, el Snackbar es informativo.

Un 422 es un error global: se muestra un mensaje seguro de backend en el modal y
Snackbar, se conserva el archivo y no se muestra resumen de éxito ni se recarga
el listado. Se filtran mensajes con diagnósticos internos; errores de servidor o
respuestas con estructura inesperada usan mensajes generales seguros.

## Pantalla y paginación local

La pantalla mantiene información del examen, contadores sobre la lista completa,
búsqueda local por nombre/apellido/SIS y filtro Todos/Habilitados/Inhabilitados.
Los contadores no dependen de la página ni de los filtros.

La paginación se aplica después de combinar búsqueda y filtro de estado:

1. Filtrar todos los registros cargados.
2. Calcular páginas de 10 registros.
3. Mostrar el segmento correspondiente con `slice`.

Si hay más de una página, se presentan Anterior, Siguiente y «Página X de Y».
Los controles se deshabilitan en los extremos. Cambiar búsqueda o estado reinicia
la página a 1. El índice de fila sigue siendo continuo entre páginas. Si la recarga
tras una modificación reduce las páginas disponibles, la página visible se limita al nuevo
máximo para evitar una página vacía fuera de rango. Cambiar de examen reinicia
paginación, filtros y modales mediante el montaje existente por `examId`.

La carga, el error y el estado vacío permanecen. La paginación no se muestra durante
carga/error ni cuando solo existe una página de resultados. No se envía `?page`,
`per_page` ni ningún otro parámetro de paginación al backend.

## Ajustes visuales

La tabla se ajusta al ancho disponible en escritorio con distribución fija y estilos
propios de HU12. Acciones tiene 150 px. Gestionar y SIS permanecen en una línea.
En pantallas pequeñas se permite scroll horizontal cuando la tabla no cabe.
Los badges HABILITADO/INHABILITADO conservan su diseño.

El motivo conserva su valor real y el texto histórico del modal es de solo lectura.
El resumen masivo utiliza tarjetas y una tabla de errores con desplazamiento cuando
es necesario. Los estilos nuevos están encapsulados en la feature de HU12.

## Modal, errores y autorización

- 403 de listado/PATCH/bulk: mensaje de falta de autorización mediante Snackbar
  y error visible en pantalla/modal. El catálogo muestra su error con reintento.
- 422 de PATCH: errores seguros de `reason_code` y `observations` junto a los campos,
  además del mensaje general; el modal conserva los valores para corregirlos.
- 422 de bulk: error global, sin simular actualizaciones.
- Otros errores: mensaje y reintento mediante los patrones existentes.
- El cliente HTTP mantiene el manejo global de sesión.

GET, catálogo, PATCH y bulk mantienen AbortSignal. Las peticiones se cancelan al
desmontar o cambiar de examen; ambos modales evitan envíos simultáneos duplicados.
La ruta de gestión sigue protegida para docentes. Una autorización de colaboración
no concede permisos de gestión de habilitaciones; backend debe validar la
responsabilidad sobre el examen.

## Dependencias reales

- **Commit de backend con el nuevo contrato:** confirmar disponibilidad real de
  `/eligibilities/reasons`, `/eligibilities/bulk`, PATCH con `reason_code` y
  `observations`, y campos nuevos del GET. La integración está preparada contra
  el contrato facilitado; no se comprobó la implementación ejecutando peticiones.
  Un endpoint ausente muestra error real; no se agrega fallback de escritura legacy.
- **Fotografía disponible en el detalle:** el contrato actual no devuelve un campo
  de fotografía. Falta el contrato de backend para incorporarla. No se inventa una
  URL ni se afecta la presentación de nombre, SIS y CI.
- **Información general de otros exámenes:** se conserva el recurso existente
  `/teacher/dashboard/upcoming-exams`. Si no devuelve el examen, se informa que
  sus datos generales no están disponibles; el GET de habilitaciones mantiene su
  propio manejo de autorización y estados.

## Revisión

Solo revisión estática de contratos, tipos, consumidores, rutas, paginación y UTF-8.
No se ejecutaron tests, build, lint, servidor, instalación de dependencias ni commit.
La validación visual y contra backend no se ejecutó por las restricciones de la tarea.
