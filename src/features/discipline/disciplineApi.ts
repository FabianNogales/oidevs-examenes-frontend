import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type { IncidentStudent } from '@/features/incidents/types/incident.types'
import type { Expulsion } from '@/features/expulsions/types/expulsion.types'
export type CaseKind = 'INCIDENT' | 'INFRACTION' | 'LEGACY_EXPULSION'
export type DisciplineCase = {
  id: number
  exam_id: number
  kind: CaseKind
  source_type: string
  source_id: number
  type: string
  description: string
  observations: string | null
  status: string
  student: IncidentStudent | null
  reported_by: { id: number; name: string } | null
  occurred_at: string
  measure_applied: boolean
  measure: Expulsion | null
  permissions: { can_expel: boolean; can_update: boolean }
}
export type CaseContext = {
  exam: { id: number; name: string; subject_name: string }
  permissions: {
    can_create: boolean
    can_manage: boolean
    can_expel: boolean
    can_export: boolean
  }
}
export type CasePage = CaseContext & {
  data: DisciplineCase[]
  meta: {
    current_page: number
    last_page: number
    total: number
    per_page: number
  }
}
export type CaseDetail = CaseContext & { data: DisciplineCase }
export type CasePayload = {
  kind: 'INCIDENT' | 'INFRACTION'
  type: string
  description: string
  observations: string
  student_id: number | null
  decision: 'RECORD' | 'EXPEL'
  reason?: string
  confirmed?: boolean
  request_key: string
}
export function caseError(cause: unknown): string {
  if (axios.isAxiosError(cause)) {
    const status = cause.response?.status
    if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.'
    if (status === 403)
      return 'No tienes autorización vigente para esta operación.'
    if (status === 404)
      return 'No se encontró el caso o el servicio aún no está disponible.'
    if (typeof cause.response?.data?.message === 'string')
      return cause.response.data.message
  }
  return 'No se pudo confirmar la operación. Comprueba la conexión y consulta el caso antes de repetirla.'
}
async function read<T>(
  path: string,
  config: { params?: Record<string, string | number>; signal?: AbortSignal },
) {
  try {
    return await httpClient.get<T>(path, config)
  } catch (cause) {
    throw new Error(caseError(cause), { cause })
  }
}

function validateCase(value: DisciplineCase, exam: number): DisciplineCase {
  if (
    !value ||
    value.exam_id !== exam ||
    !Number.isSafeInteger(value.id) ||
    value.id < 1 ||
    !['INCIDENT', 'INFRACTION', 'LEGACY_EXPULSION'].includes(value.kind) ||
    typeof value.description !== 'string'
  )
    throw new Error('El caso recibido no corresponde al examen solicitado.')
  return value
}
export async function listCases(
  exam: number,
  filters: Record<string, string | number> = {},
  signal?: AbortSignal,
): Promise<CasePage> {
  const { data } = await read<CasePage>(`/exams/${exam}/discipline-cases`, {
    params: filters,
    signal,
  })
  if (
    data.exam?.id !== exam ||
    !Array.isArray(data.data) ||
    !data.meta ||
    !data.permissions
  )
    throw new Error('La consulta de casos está incompleta.')
  data.data.forEach((item) => validateCase(item, exam))
  return data
}
export async function getCase(
  exam: number,
  id: number,
  signal?: AbortSignal,
): Promise<CaseDetail> {
  const { data } = await read<CaseDetail>(
    `/exams/${exam}/discipline-cases/${id}`,
    { signal },
  )
  validateCase(data.data, exam)
  if (data.data.id !== id) throw new Error('El servidor devolvió otro caso.')
  return data
}
export async function resolveCase(
  exam: number,
  source: string,
  id: number,
  signal?: AbortSignal,
): Promise<CaseDetail> {
  const { data } = await read<CaseDetail>(
    `/exams/${exam}/discipline-cases/resolve`,
    { params: { source_type: source, source_id: id }, signal },
  )
  validateCase(data.data, exam)
  if (
    source !== 'EXPULSION' &&
    (data.data.source_id !== id || data.data.source_type !== source)
  )
    throw new Error('La referencia del caso es incorrecta.')
  return data
}
export async function saveCase(
  exam: number,
  payload: CasePayload,
): Promise<CaseDetail> {
  const { data } = await httpClient.post<CaseDetail>(
    `/exams/${exam}/discipline-cases`,
    payload,
  )
  validateCase(data.data, exam)
  return data
}
export async function expelCase(
  exam: number,
  id: number,
  reason: string,
): Promise<CaseDetail> {
  const { data } = await httpClient.post<CaseDetail>(
    `/exams/${exam}/discipline-cases/${id}/expulsion`,
    { reason, confirmed: true },
  )
  validateCase(data.data, exam)
  if (data.data.id !== id) throw new Error('El servidor devolvió otro caso.')
  return data
}
