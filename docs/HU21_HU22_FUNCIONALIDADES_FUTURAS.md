# HU21/HU22 — Preservación de capacidades y reconciliación

## Alcance y fuente recuperable

Base original anterior a la integración: **`f6db3be4de36224a4ede03bf079626b0cb86b2b2`**.
Las rutas de este documento son relativas al frontend oficial. Esta referencia
conserva las implementaciones originales completas, incluidos predicados,
configuraciones de campos y JSX. No se copian arrays de personas ni eventos ficticios
a componentes operativos ni se duplican cientos de líneas de filtros inactivos.

Recuperación de lectura, sin alterar archivos, staging ni ramas:

```powershell
git show f6db3be4de36224a4ede03bf079626b0cb86b2b2:src/features/admin/profile/tabs/StudentSubjectHistoryTab.tsx
git show f6db3be4de36224a4ede03bf079626b0cb86b2b2:src/features/admin/api/adminUsersMock.ts
```

Para los demás componentes, sustituir únicamente la ruta por la indicada abajo.
Recuperar los predicados/diseño; **no reactivar los arrays `MOCK_*`**.
El commit `83e982e` introduce HU21; `896317b` y `61e92ee` incorporan/adaptan
tarjetas y pestañas. Hay otros aportes integrados; estas referencias no atribuyen
toda la interfaz a una sola persona ni identifican quién preparó cambios locales.

`tabs/` abrevia `src/features/admin/profile/tabs/` y `api/` abrevia
`src/features/admin/api/`.

## HU21-P01 — Búsqueda de cuentas por CI y rol

- **Origen:** `api/adminUsersMock.ts`, `getAdminUsersMock`.
- **Antes:** búsqueda conjunta por nombres en ambos órdenes, correo, código, CI y
  `role_label`, seguida de paginación local sobre todo el conjunto mock.
- **Datos:** CI de perfiles y asignaciones permanentes ya forman parte del recurso
  real de cuentas; la representación traducida del rol requiere mapeo explícito.
- **Pendiente API:** extender/verificar `search` de `GET /api/v1/admin/users` para CI
  y nombres/códigos de roles; no falta un nuevo catálogo de roles ni se propone una tabla.
- **Conservado:** DataTable, búsqueda, columnas y paginación; mock original intacto
  pero sin consumo operativo; TODO en `adminUsersApi.ts`.
- **Activación:** ampliar el contrato servidor con autorización existente, probar
  búsqueda y conteos sobre varias páginas; después ampliar la ayuda del buscador.
- **Git:** base completa anterior, ruta `api/adminUsersMock.ts`.

## HU21-P02 — Grupos, tipo de grupo y búsqueda por grupo

- **Origen:** campos `groupAndTerm` de las pestañas académicas; `getGroupTypeLabel`
  en `TeacherActiveSubjectsTab`, `TeacherSubjectHistoryTab`, `TeacherActiveExamsTab`
  y `TeacherExamHistoryTab`.
- **Antes:** mostraba códigos de grupo de ejemplo y deducía «Grupo mixto/individual»
  a partir de la cantidad de carreras; permitía buscar el código de grupo.
- **Datos faltantes:** referencia/código real de grupo y una regla institucional de
  tipología. La relación materia–carreras no demuestra por sí sola el tipo de grupo.
- **Pendiente BD/API:** definir la fuente persistida de grupo por oferta; exponer
  código/tipo y búsqueda paginada. Este documento no prescribe tablas ni migraciones.
- **Conservado:** campos Grupo/Gestión, pills, clases CSS y carreras reales; el texto
  actual «Vinculacion» describe carreras asociadas, no inventa un grupo. TODO en el mapper.
- **Activación:** incorporar identidad real al contrato, mapearla y recuperar búsqueda
  y tipología solo con regla aprobada. No reemplazar ausencias por grupos de ejemplo.
- **Git:** base + los cuatro archivos `tabs/` anteriores y `StudentCurrentSubjectsTab.tsx`.

Fragmento original breve conservado como referencia, **no como regla operativa**:

```tsx
// TODO(HU21-P02): habilitar una tipología solo tras aprobar su fuente y regla.
// Original: return careersCount > 1 ? 'Grupo mixto' : 'Grupo individual'
```

## HU21-P03 — Resultado académico, badges y búsqueda por resultado

- **Origen:** `tabs/StudentSubjectHistoryTab.tsx`, celda `approvalStatus` y predicado
  que admitía «aprobado/reprobado».
- **Antes:** presentaba badges verde/rojo y resultados de ejemplo APPROVED/FAILED.
- **Datos faltantes:** resultado final persistido con relación inequívoca a la
  inscripción y definición académica aprobada. Una habilitación o asistencia no es una nota.
- **Pendiente BD/API:** definir fuente académica y contrato validable; el contrato
  integrado actual no aporta resultados finales. No calcularlos desde el ingreso.
- **Conservado:** `components/AcademicResultBadge.tsx` contiene el JSX original de
  ambos badges, punto e identificación por color usando DataTable.module.css.
  `StudentSubjectHistoryTab` lo utiliza; la ausencia se muestra de forma explícita.
  El mapper mantiene NOT_RECORDED y un TODO para impedir resultados inventados.
- **Activación:** validar/mapear resultados persistidos, probar ausencia/valores
  inválidos, habilitar búsqueda paginada y recuperar los dos estados ya conservados.
- **Git:** base + `tabs/StudentSubjectHistoryTab.tsx`.
- **Aclaración:** `approval_status` y `academic_term_id` eran parámetros sugeridos
  en comentarios del contrato original; no existía allí un selector UI implementado
  para ellos. No se presentan como filtros visuales perdidos.

## HU21-P04 — Búsqueda académica por carrera, correo y tipología

- **Origen:** predicados `filteredSubjects`/`filteredHistory` de pestañas de materias
  docentes y estudiantiles, `filteredExams`/`filteredExamHistory` en exámenes docentes
  y búsqueda en `CollaboratorRoleTab`.
- **Antes:** según la pestaña, comparaba nombres de carreras, correo docente,
  código de grupo y texto del tipo de grupo además de materia/docente/gestión.
- **Datos disponibles:** carreras asociadas, correo docente y período de cada oferta
  ya se muestran desde los registros integrados. Grupo/tipología dependen de P02.
- **Pendiente API:** búsqueda global por esos campos en
  `GET /api/v1/admin/profiles/{students|teachers}/{profileId}/records`;
  no basta con filtrar la página recibida. No hace falta inventar carreras ni correos.
- **Conservado:** grillas, campos, pills, correo y carreras reales; predicados completos
  recuperables en Git y TODO central en `useProfileRecords.ts`.
- **Activación:** ampliar y documentar búsqueda servidor por sección, verificar
  paginación y permisos; luego recuperar los textos de ayuda correspondientes.
- **Git:** base + `StudentSubjectHistoryTab`, `TeacherActiveSubjectsTab`,
  `TeacherSubjectHistoryTab`, `TeacherActiveExamsTab`, `TeacherExamHistoryTab` y
  `CollaboratorRoleTab`, todos en `tabs/` con extensión `.tsx`.

## HU21-P05 — Búsqueda por fecha, tipo de examen y fecha de designación

- **Origen:** `TeacherActiveExamsTab`, `TeacherExamHistoryTab`, `CollaboratorRoleTab`.
- **Antes:** buscaba el texto visible de fecha/tipo y, en colaboraciones, designación.
- **Datos disponibles:** fecha/hora, tipo persistido de examen y `assigned_at` de la
  asignación. No se deduce «Primer/Segundo parcial» de un genérico `partial`.
- **Pendiente API:** consultas paginadas por esos campos y formato/rango de fechas
  acordado con zona America/La_Paz; no faltan fechas de ejemplo.
- **Conservado:** campos Fecha/Examen, badge de tipo, fecha de asignación y sus estilos;
  predicados originales en Git. Los tipos detallados antiguos siguen en sus unions.
- **Activación:** especificar filtros/búsqueda y semántica temporal en servidor,
  probar límites horarios y paginación; reactivar ayudas de búsqueda precisas.
- **Git:** base + los tres archivos `tabs/` anteriores, extensión `.tsx`.

## HU22-P06 — Búsqueda de historial por rol, autorizador, motivo y fecha

- **Origen:** `tabs/RoleHistoryTab.tsx`, predicado `filteredRoleLogs`.
- **Antes:** buscaba etiqueta de rol, descripción, autorizador, rol autorizador y fecha.
- **Datos disponibles:** eventos persistidos, actor, fecha y acción; algunos nombres
  se resuelven desde el perfil actual. Motivo y rol histórico del actor dependen de P07.
- **Pendiente API:** ampliar la búsqueda de `section=roles` más allá del código de
  acción, sin sustituir un evento histórico por el estado actual del usuario.
- **Conservado:** tarjetas de rol, badges, fecha y campos de responsable; TODO central
  y predicado original en Git. La búsqueda actual sigue funcionando por código de acción.
- **Activación:** definir mapeos de roles/acciones, búsqueda autorizada por actor/fecha
  y paginación; habilitar cada campo únicamente cuando tenga una fuente fiable.
- **Git:** base + `tabs/RoleHistoryTab.tsx`.

## HU22-P07 — Motivos y rol histórico del autorizador

- **Origen:** campos «Motivo», «Autorizado por» y «Rol autorizador» de RoleHistoryTab.
- **Antes:** todos los ejemplos incluían nombre, rol del autorizador y descripción.
- **Datos faltantes:** motivo y snapshot verificable del rol/contexto en el instante
  del evento cuando no estén conservados en auditoría. El rol actual no prueba el pasado.
- **Pendiente persistencia/API:** precisar qué contexto registra cada evento futuro
  y proyectarlo de forma limitada; no sobrescribir ni completar auditorías antiguas
  por suposición. No se prescribe nueva tabla ni se amplía HU26 aquí.
- **Conservado:** campos, estilos y componente de historial; ausencia explícita del
  rol pasado. «Accion registrada» evita presentar una acción como motivo. TODO en mapper.
- **Activación:** conservar contexto fiable en nuevas operaciones y exponer campos
  opcionales; mostrar motivos reales donde existan y ausencia en registros incompletos.
- **Git:** base + `tabs/RoleHistoryTab.tsx`.

## HU22-P08 — Historial completo de períodos de colaboración

- **Origen:** `tabs/CollaboratorRoleTab.tsx`, Activas/Concluidas y contadores.
- **Antes:** varias filas de ejemplo parecían representar un archivo completo.
- **Datos disponibles:** última asignación conservada por examen y eventos auditados
  existentes; los períodos no conservados no pueden reconstruirse.
- **Pendiente API:** una proyección por episodio basada en eventos reales, con
  revocaciones/aperturas correlacionadas y señal de historial incompleto; no contar
  dos eventos técnicos como dos colaboraciones ni inventar altas iniciales.
- **Conservado:** ambos botones, selección, contadores, tarjetas, búsqueda y mensajes;
  hoy consumen la última relación real y explican el alcance. Eventos anteriores
  conservados pueden consultarse en la pestaña de autorizaciones.
- **Activación:** acordar semántica del historial, reutilizar auditoría de colaboraciones
  y exponer episodios reales paginados. Conservar permisos administrativos.
- **Git:** base + `tabs/CollaboratorRoleTab.tsx`.

## HU21-P09 — Períodos reales y futuros filtros por gestión

- **Origen:** badges de StudentCurrentSubjectsTab, TeacherActiveSubjectsTab y
  TeacherActiveExamsTab; período mostrado también en cada tarjeta académica.
- **Antes:** el badge de cabecera contenía literalmente `II/2026`.
- **Ahora operativo:** `ProfileActiveTermBadge` reutiliza `useActiveAcademicTerm`
  y `GET /api/v1/admin/academic-terms/active` de HU24. Mantiene las clases originales
  y muestra carga, período real, ausencia o error con reintento. El período de cada
  tarjeta sigue viniendo de su propia oferta; no se sustituye por el período actual.
- **Datos/API faltantes para el badge:** ninguno nuevo. Su comprobación en navegador
  y las pruebas de esta reconciliación quedan pendientes; no se ejecutaron suites.
- **Pendiente adicional:** parámetros estructurados por `academic_term_id` que algunos
  comentarios originales proponían. Requieren contrato servidor y selección de UX;
  no se afirma que ya hubiese un selector visual. La búsqueda textual vigente continúa.
- **Conservado:** badges, colores, distribución y campos de período; contrato sugerido
  completo recuperable por Git. Nunca restaurar el literal anterior.
- **Git:** base + las tres pestañas anteriores y comentarios de StudentSubjectHistoryTab.

## Componentes e interacciones protegidos

Se mantienen DataTable/DataTableRow, DataCardGrid/DataCardItem, ConfirmDialog,
EntityProfileLayout, ProfileOverviewTab, ProfileEditTab (incluido su selector
personalizado de estado), registro de pestañas y todos sus CSS Modules.
La asignación/retiro HU22 y el estado global HU21 conservan las integraciones actuales.
La colaboración temporal no se transforma en rol permanente.

El detalle modal actual y sus enlaces de perfil no se reemplazan por el antiguo
destino `/admin/users/:id`, que no tenía ruta registrada en la base revisada.
La revisión visual pendiente debe reconciliar su presentación sin perder estos accesos.

No se audita nuevamente el backend en esta reconciliación: las carencias anteriores
describen el contrato de integración conocido. Antes de ampliar endpoints o esquema,
comprobar su versión vigente y no duplicar fuentes existentes.

## Criterios para activar una capacidad pendiente

1. Confirmar contrato/datos actuales y autorización sin ampliar permisos.
2. Recuperar JSX/predicado por la referencia completa de Git, sin los registros mock.
3. Integrar filtros en servidor antes de paginar; no filtrar solo la página visible.
4. Mantener componentes/CSS originales y representar ausencias explícitamente.
5. Probar casos válidos, vacíos, errores y varias páginas; comparar escritorio/móvil.

Esta reconciliación no modifica backend, esquema, autenticación ni decisiones de Sprint 3.
