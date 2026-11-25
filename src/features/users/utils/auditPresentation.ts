const actions: Record<string, string> = {
  READ: 'Consulta de información', WRITE: 'Operación de actualización',
  CREATE: 'Creación de registro', UPDATE: 'Actualización de registro', DELETE: 'Eliminación de registro',
  ADMIN_ACCESS_GRANTED: 'Acceso administrativo autorizado', ADMIN_ACCESS_DENIED: 'Acceso administrativo denegado',
  LOGIN_SUCCESS: 'Inicio de sesión correcto', LOGIN_FAILED: 'Intento de acceso fallido', LOGOUT: 'Cierre de sesión',
}
const entities: Record<string, string> = {
  ADMIN_PANEL: 'Administración', Exam: 'Examen', User: 'Usuario', Student: 'Estudiante', Teacher: 'Docente',
  Room: 'Aula', Subject: 'Materia', CourseOffering: 'Asignación de materia', AcademicTerm: 'Periodo académico',
  Role: 'Rol', Backup: 'Respaldo', ExamCollaborator: 'Colaborador del examen', Enrollment: 'Inscripción',
}
const subjects: Record<string, string> = {
  USER: 'Usuario', TEACHER: 'Docente', STUDENT: 'Estudiante', ROOM: 'Aula', SUBJECT: 'Materia',
  EXAM: 'Examen', ENROLLMENT: 'Inscripción', ROLE: 'Rol', STAFF_ACCOUNT: 'Cuenta del personal',
  ACADEMIC_TERM: 'Periodo académico', EXAM_COLLABORATOR: 'Colaborador del examen',
  ELIGIBILITY_CRITERION: 'Criterio de habilitación', PORTAL_CATEGORY: 'Categoría institucional', BACKUP: 'Respaldo',
}
const verbs: Record<string, string> = {
  CREATED: 'creación', UPDATED: 'actualización', STATUS_CHANGED: 'cambio de estado',
  ASSIGNED: 'asignación', REVOKED: 'revocación', PERMISSIONS_CHANGED: 'cambio de permisos',
  REQUESTED: 'solicitud', COMPLETED: 'finalización', FAILED: 'fallo', DOWNLOADED: 'descarga',
}
export function auditActionLabel(code: string): string {
  if (actions[code]) return actions[code]
  for (const [subject, label] of Object.entries(subjects)) {
    const verb = code.startsWith(`${subject}_`) ? verbs[code.slice(subject.length + 1)] : null
    if (verb) return `${label}: ${verb}`
  }
  return 'Actividad registrada'
}
export function auditEntityLabel(type: string): string {
  return entities[type] ?? 'Registro del sistema'
}
const fields: Record<string, string> = {
  course_offering_id: 'Asignación de materia (ID)', exam_id: 'Examen (ID)', qr_exam_id: 'Examen del QR (ID)',
  student_id: 'Estudiante (ID)', room_id: 'Aula (ID)', collaborator_user_id: 'Colaborador (ID)',
  assigned_by: 'Asignado por (ID)', opening_event_id: 'Evento de apertura (ID)', duration_minutes: 'Duración (minutos)',
  source: 'Origen', outcome: 'Resultado', mode: 'Modalidad', scope: 'Alcance', method: 'Método', reason: 'Motivo',
  operation: 'Operación', status: 'Estado', evaluation_type: 'Tipo de evaluación', history_complete: 'Historial completo',
  assigned_at: 'Fecha de asignación', revoked_at: 'Fecha de revocación', exam_date: 'Fecha del examen', start_time: 'Hora de inicio',
  summary: 'Resumen', totalProcessed: 'Registros procesados', successfulRecords: 'Registros correctos',
  duplicateRecords: 'Registros duplicados', failedCount: 'Registros con error', name: 'Nombre',
  description: 'Descripción', permission_keys: 'Permisos', backup_id: 'Respaldo (ID)', ticket_jti: 'Comprobante (ID)', error_code: 'Código del resultado',
}
const values: Record<string, string> = {
  ACTIVE: 'Activo', INACTIVE: 'Inactivo', ELIGIBLE: 'Habilitado', INELIGIBLE: 'Inhabilitado',
  SCHEDULED: 'Programado', RESCHEDULED: 'Reprogramado', CANCELLED: 'Cancelado',
  MANUAL: 'Manual', CSV: 'Importación CSV', QR: 'Código QR', APPLICATION: 'Aplicación', CONFIRMED: 'Confirmado',
  WRONG_EXAM: 'QR de otro examen', ENROLLMENT: 'Inscripción', COURSE_OFFERING: 'Asignación de materia',
  ENROLLMENT_CREATED: 'Inscripción registrada', ENROLLMENTS_IMPORTED: 'Inscripciones importadas', EXAM_SCHEDULED: 'Examen programado',
  partial: 'Parcial', final: 'Final', makeup: 'Segunda instancia', QUEUED: 'En espera', RUNNING: 'En ejecución',
  UPLOADING: 'En carga', AVAILABLE: 'Disponible', FAILED: 'Fallido',
}
export function auditContextRows(context: Record<string, unknown> | []): { label: string; value: string }[] {
  if (Array.isArray(context)) return []
  const rows: { label: string; value: string }[] = []
  const visit = (object: Record<string, unknown>, prefix = '') => {
    for (const [key, value] of Object.entries(object)) {
      const label = `${prefix}${fields[key] ?? key.replace(/_/g, ' ')}`
      if (value && typeof value === 'object' && !Array.isArray(value)) visit(value as Record<string, unknown>, `${label} · `)
      else rows.push({ label, value: value == null ? 'Sin dato' : typeof value === 'boolean' ? (value ? 'Sí' : 'No')
        : Array.isArray(value) ? value.map(String).join(', ') || 'Sin datos' : values[String(value)] ?? String(value) })
    }
  }
  visit(context)
  return rows
}
