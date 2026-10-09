# HU15 y HU16: colaboraciones temporales

Frontend en `Dev_Erick`, alineado con el contrato definitivo de HU15/HU16 del
backend `Dev_Hector`, commit `4611ccf`, confirmado por el usuario. Las rutas usan
`env.apiUrl` (`/api/v1`). La búsqueda contextual y la regla académica se consideran
parte del contrato definitivo, sin compatibilidad con el buscador anterior.

## API definitiva

| Función | Petición | Contrato |
| --- | --- | --- |
| `getMyCollaborations()` | GET `/me/collaborations` | `data: MyCollaboration[]`, solo autorizaciones vigentes |
| `getExamCollaborators(examId)` | GET `/exams/{exam_id}/collaborators` | `data: ExamCollaborator[]` |
| `searchCollaborationUsers(query, examId, signal)` | GET `/users?exam_id={examId}&search={query}` | `data: CollaborationUser[]`, candidatos activos válidos para el examen |
| `assignExamCollaborator(examId, userId)` | POST `/exams/{exam_id}/collaborators` | `{ "user_id": userId }` |
| `revokeExamCollaborator(examId, userId)` | DELETE `/exams/{exam_id}/collaborators/{user_id}` | Identificador del usuario, no del registro de asignación |

La asignación no envía `assigned_by`: backend lo determina. No hay adaptación de
identificadores ni excepciones para silenciar 401. Se recarga el listado oficial
tras las mutaciones, sin fabricar registros a partir de la respuesta del POST.

## HU15: regla funcional definitiva

Cualquier usuario activo registrado en EIDA puede ser designado como colaborador
temporal. Si el usuario posee condición de estudiante y mantiene una inscripción
activa en la oferta académica correspondiente al examen, no puede ser designado
como colaborador de dicha evaluación.

La autorización temporal no modifica ni reemplaza los roles permanentes del usuario.

- Docente activo u otro usuario activo sin la condición excluyente: permitido.
- Estudiante activo sin inscripción activa en la oferta del examen: permitido.
- Usuario con condición de estudiante e inscripción activa en esa oferta: no permitido.
- Usuario inactivo: no permitido.

Backend es la fuente de verdad para la validez de cada candidato, incluso cuando
un usuario tenga varios roles. Frontend no filtra por rol, aprobación o inscripción,
ni consulta recursos académicos para reproducir la regla.

El buscador conserva `/users`, la búsqueda por nombre, CI o correo, debounce de
300 ms y AbortController. `ExamCollaboratorsPage` entrega `exam.id` al modal;
el modal llama `searchCollaborationUsers(query, examId, signal)`. La API envía
`params: { search: query.trim(), exam_id: examId }`. El contexto es obligatorio
en la firma, sin añadir endpoints alternativos ni compatibilidad legacy.
Cambiar de examen cancela la búsqueda y reinicia el modal para no reutilizar
resultados o selecciones del examen anterior.

El contrato de búsqueda devuelve `id`, `display_name`, `email` e `identity_number`;
no incluye estado activo, roles ni inscripciones. Frontend no inventa esos campos.
Según el contrato confirmado de `4611ccf`, `/users` procesa `exam_id`, incluye
usuarios activos de cualquier rol y excluye candidatos con condición de estudiante
e inscripción activa en la oferta del examen. La exclusión también aplica si el
usuario tiene otro rol además del perfil de estudiante. El POST vuelve a validar
la misma regla, junto con la responsabilidad sobre el examen y los duplicados.
Frontend muestra exactamente la lista `data` recibida; no oculta candidatos por
rol ni reproduce inscripciones. La prevención local de selección de un usuario
ya asignado conserva su función de UX; backend sigue validando duplicados.

El modal mantiene «Buscar usuario», el placeholder «Buscar por nombre, CI o correo»
y explica: «Puedes asignar usuarios activos como colaboradores. Los usuarios con
inscripción estudiantil activa en la oferta de este examen no están disponibles.»
La ausencia de un candidato no se presenta como error ni se mencionan roles en el
selector. Ante un 422, se prioriza el mensaje seguro de `errors.user_id` o
`errors.exam_id`, seguido de `message`, sin reemplazar un rechazo útil por un texto
genérico. Todos esos mensajes pasan por el filtro existente de diagnósticos internos;
los fallbacks se usan si no hay un mensaje seguro. Los 401 mantienen su flujo global.

Los usuarios ya asignados al examen no se pueden seleccionar. Las solicitudes de
asignación y revocación conservan protección frente a envíos duplicados. Un usuario
puede colaborar en distintos exámenes: solo se impide repetirlo en el mismo examen.
La revocación identifica `collaborator.user_id` y afecta a esa autorización concreta.
No se modifica el rol permanente del usuario.

La tabla consume el GET oficial y muestra nombre, CI, correo y fecha de asignación.
Ver conserva el detalle de solo lectura con `assigned_by_name`, fecha completa y
los datos del usuario. Después de asignar/revocar se cierra el modal, aparece el
Snackbar, se recarga el listado HU15 y se refresca CollaborationsProvider.
Los errores de negocio se muestran siguiendo el patrón existente; los diagnósticos
internos y errores de servidor utilizan textos de UI.

Estado vacío: «Aún no hay colaboradores asignados a este examen.»

## HU15: tabla responsive

La tabla usa el 100 % del ancho disponible con distribución fija: # de 49 px,
Colaborador flexible, CI de 120 px, Correo de 240 px, Fecha de 180 px y Acciones
de 180 px. Los estilos exclusivos de HU15 conservan Ver/Revocar en una línea,
sin contracción y con gap consistente. Los correos usan ellipsis y `title`.

La fecha de tabla se muestra como `08/10/2026 17:36`, con hora de 24 horas y sin
segundos. El modal Ver y el `title` de la celda conservan la fecha completa.
En escritorio no se fuerza un ancho mínimo ni scroll horizontal. En pantallas
pequeñas se permite scroll cuando la tabla no cabe.

## HU16: apartado Colaborador y contexto temporal

Header → Colaborador → Apartado de colaborador → examen autorizado → Control de ingreso.

La opción del Header se denomina «Colaborador» y apunta a `/collaborator`.
Se añade únicamente si `collaborations.length > 0`, sin condiciones sobre el rol
permanente. La página está protegida por autenticación para estudiantes, docentes,
administradores y otros usuarios autorizados. No existe una ruta duplicada
`/collaborations` ni navegación con el nombre anterior. La navegación habitual
del usuario y sus permisos permanecen intactos.

CollaboratorPage se titula «Apartado de colaborador» y presenta el subtítulo:
«Consulta los exámenes en los que tienes una autorización temporal y accede a
las herramientas de control de ingreso.» Mantiene carga, error con reintento
y el estado vacío «No tienes exámenes disponibles como colaborador.»
Recarga las autorizaciones al entrar; no conserva tarjetas de una sesión anterior
ni fabrica datos cuando backend devuelve una lista vacía.

Las tarjetas se alimentan exclusivamente de `/me/collaborations`, que devuelve
solo colaboraciones vigentes. Usan `exam_id`, `exam_name`, `subject_name`,
`exam_date`, `start_time`, `duration_minutes` y `room` (texto). Reutilizan
CollaborationExamCard/ExamCard para mostrar materia, título, fecha, hora, duración,
ambiente, el badge «APOYO EN EXAMEN» y la acción Control de ingreso.

StudentQrPage mantiene sus exámenes propios y sus acciones de QR. No muestra
colaboraciones ni modifica Mis datos y las demás funcionalidades del estudiante.
TeacherExamsPage mantiene los exámenes donde el docente es responsable, con
Habilitaciones, Colaboradores y Control de ingreso. Un docente puede gestionar
sus exámenes propios y ser colaborador de otros simultáneamente, en listas
separadas. Se retiró SupportingExamsSection y sus estilos al quedar sin uso.

## Perfil del Header: presentación contextual

«Colaborador temporal» es un contexto visual, no un rol permanente. AppLayout
calcula `inCollaboratorContext` desde la ubicación actual:

- `/collaborator`, con o sin barra final.
- `/exams/:examId/entry-control` solo si `from=collaborator`.

No basta con tener autorizaciones y no se marca todo Control de ingreso como
contexto colaborador. `from=teacher` conserva el contexto de docente responsable.
Se reutiliza `HeaderUser.roleLabel`, que HeaderAccount ya admite como subtítulo
de presentación. AppLayout entrega «Colaborador temporal» únicamente dentro del
contexto; fuera lo deja sin override y HeaderAccount vuelve al texto del rol
permanente. El nombre y `HeaderUser.role` permanecen iguales.

Al navegar entre secciones se recalcula el subtítulo sin estado global adicional,
persistencia ni cambios en AuthContext. El usuario conserva todos sus roles y
permisos habituales. El parámetro contextual no otorga autorización: backend sigue
validando el acceso y EntryControlPage consulta las autorizaciones vigentes.

## Provider, rutas y permisos

CollaborationsProvider mantiene `collaborations`, `isLoading`, `error` y `reload`.
Consulta para cualquier usuario autenticado habilitado para navegar, sin filtros
por rol. Asocia los datos al usuario actual, vacía el estado al cerrar sesión y
aborta peticiones al desmontar, cambiar de usuario o recargar. Los 401 siguen el
manejo global de sesión.

Se recarga al entrar al apartado Colaborador, abrir Control de ingreso y completar
una asignación/revocación en la sesión actual. Las operaciones en otras sesiones
se reflejan en la siguiente consulta; no se añade sincronización en tiempo real.

- `/teacher/exams/:examId/collaborators`: gestión HU15, protegida para docentes.
- `/students/qr`: Mis exámenes propios del estudiante y sus funciones de QR.
- `/teacher/exams`: Mis exámenes propios del docente responsable.
- `/collaborator`: Apartado de colaborador, sin restricciones de rol permanente.
- `/exams/:examId/entry-control`: una única EntryControlPage para ambos orígenes.
  El acceso colaborador se comprueba mediante las colaboraciones vigentes del
  usuario. Las tarjetas del apartado usan `from=collaborator`: el Header muestra
  «Colaborador temporal» y el breadcrumb/regreso indica «Colaborador», hacia
  `/collaborator`. Las tarjetas propias del docente mantienen `from=teacher`;
  EntryControlPage comprueba su rol DOCENTE para usar el listado del responsable,
  mantiene el subtítulo permanente y vuelve a «Mis exámenes» en `/teacher/exams`.

La autorización temporal no concede edición de examen, gestión de colaboradores
ni gestión de habilitaciones. El contexto colaborador ofrece únicamente
Verificación y Escanear QR; backend debe comprobar autorización por examen en toda
operación. Las rutas de gestión conservan sus protecciones habituales y la
validación de titularidad de backend. No se crea un rol COLABORADOR ni un módulo
de administración de roles dinámicos.

## Pendientes reales y revisión

HU13/HU14 no se desarrollan: sus herramientas existentes siguen deshabilitadas.
HU15 conserva la fuente de información del examen del recurso docente de próximos
exámenes; no se inventa un endpoint de detalle.

La confirmación del usuario cierra el pendiente del contrato de búsqueda y la regla C
del POST para `4611ccf`. No queda una regla académica por implementar en frontend.

La copia local del repositorio backend observada durante la revisión sigue en
`Dev_Hector` / `8301443`; no representa el commit confirmado `4611ccf` y no se
modificó. Si se usa esa copia para validación manual, debe actualizarse fuera de
este cambio. La integración se basa en el contrato actualizado aportado por el
usuario; no se afirma haber validado su ejecución contra el backend nuevo.

Solo revisión estática de contratos, consumidores, rutas y UTF-8. No se ejecutaron
tests, build, lint, servidor, instalación de dependencias ni commit. La validación
visual y contra backend no se ejecutó por las restricciones de esta tarea.
