import { httpClient } from '@/shared/api/httpClient'
import { accountError, AdminAccountError, eventLabel, isId, isObject, readMeta, roleLabel } from './adminUsersApi'

export type ProfileSection = 'subjects' | 'subject-history' | 'exams' | 'exam-history' | 'roles' | 'collaborations'
export type ProfileRecord = {
  id: number; subjectName: string; subjectCode: string; groupCode: string; academicTerm: string; careers: string[]
  teacherFullName: string; teacherEmail: string; examDate: string; examType: string; examName: string
  assignedAt: string; collaborationStatus: 'ACTIVE' | 'COMPLETED'; approvalStatus: 'NOT_RECORDED'
  roleCode: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'COLLABORATOR' | 'UNKNOWN'; roleLabel: string
  actionDescription: string; changedAt: string; authorizedByName: string; authorizedByRole: string
}
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value : 'No registrado'
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }) : 'No registrada'
export async function getProfileRecords(type: 'students' | 'teachers', id: number | string, section: ProfileSection,
  page: number, search: string, state: string, signal: AbortSignal) {
  try {
    const { data } = await httpClient.get(`/admin/profiles/${type}/${id}/records`, { params: { section, page, per_page: 10, search, state }, signal })
    if (!Array.isArray(data?.data) || !data.data.every((row: unknown) => isObject(row) && isId(row.id) &&
      (section === 'roles' ? typeof row.action === 'string' && (row.role === null || typeof row.role === 'string') :
        ['subject_name', 'subject_code', 'academic_term'].every((key) => row[key] === null || typeof row[key] === 'string')))) throw new AdminAccountError('El historial recibido no es válido.')
    const items = data.data.map((row: Record<string, unknown>): ProfileRecord => ({
      id: Number(row.id), subjectName: text(row.subject_name), subjectCode: text(row.subject_code),
      // TODO(HU21-P02): require a real group reference/type; careers do not define a group.
      groupCode: text(row.group_code), academicTerm: text(row.academic_term),
      careers: Array.isArray(row.careers) ? row.careers.filter((name): name is string => typeof name === 'string') : [],
      teacherFullName: text(row.teacher_name), teacherEmail: text(row.teacher_email),
      examName: text(row.exam_name), examDate: row.exam_date ? `${text(row.exam_date)} ${text(row.start_time)}` : 'No registrada',
      examType: ({ partial: 'Parcial', final: 'Examen final', makeup: 'Recuperatorio' }[String(row.evaluation_type)] ?? 'No registrado'),
      assignedAt: date(row.assigned_at), collaborationStatus: row.collaboration_status === 'ACTIVE' ? 'ACTIVE' : 'COMPLETED',
      // TODO(HU21-P03): validate the persisted result contract before mapping APPROVED/FAILED.
      // AcademicResultBadge preserves both original visual states without fabricating data.
      approvalStatus: 'NOT_RECORDED',
      roleCode: ({ ADMINISTRADOR: 'ADMIN', DOCENTE: 'TEACHER', ESTUDIANTE: 'STUDENT', COLLABORATOR: 'COLLABORATOR' }[String(row.role)] ?? 'UNKNOWN') as ProfileRecord['roleCode'],
      roleLabel: roleLabel(text(row.role)), actionDescription: eventLabel(text(row.action)) + (isId(row.exam_id) ? ` · Examen ${row.exam_id}: ${text(row.exam_name)}` : ''), changedAt: date(row.changed_at),
      // TODO(HU22-P07): only a role snapshot AT THE EVENT can identify the authorizer's past role.
      authorizedByName: text(row.actor_name), authorizedByRole: 'No registrado en el evento',
    }))
    const meta = readMeta(data.meta, items.length)
    if (data.summary !== null && (!isObject(data.summary) || !['active', 'completed'].every((key) =>
      Number.isSafeInteger(data.summary[key]) && data.summary[key] >= 0))) throw new AdminAccountError('Los contadores recibidos no son válidos.')
    return { items, pagination: { currentPage: meta.current_page, lastPage: meta.last_page, total: meta.total, from: meta.from, to: meta.to },
      summary: data.summary as { active: number; completed: number } | null }
  } catch (cause) { throw accountError(cause) }
}
