import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import { InfractionApiError } from '@/features/infractions/api/infractionErrors'
import {
  readInfractionExam,
  readInfractionMeta,
} from '@/features/infractions/api/infractionResponse'
import {
  positiveId,
  isTimestamp,
  isInfractionType,
  isInfractionStatus,
} from '@/features/infractions/utils/infractionValidation'
import type {
  Expulsion,
  ExpulsionPage,
  ExpulsionDetail,
  ExpulsionHistory,
  ExpulsionPayload,
  RelatedInfraction,
} from '../types/expulsion.types'
function invalid(): never {
  throw new InfractionApiError(
    'El servidor devolvió una expulsión incompleta o ajena al contexto solicitado. Consulta el listado antes de repetir la operación.',
  )
}
function check(...ids: number[]) {
  if (!ids.every(positiveId))
    throw new InfractionApiError('El identificador solicitado no es válido.')
}
function endpoint(exam: number) {
  check(exam)
  return `/exams/${exam}/expulsions`
}
function failure(cause: unknown): never {
  if (cause instanceof InfractionApiError || axios.isCancel(cause)) throw cause
  const status = axios.isAxiosError(cause)
    ? (cause.response?.status ?? null)
    : null
  const fields: Record<string, string> = {}
  if (status === 422 && axios.isAxiosError(cause))
    for (const key of ['student_id', 'reason', 'infraction_id']) {
      const messages = cause.response?.data?.errors?.[key]
      if (Array.isArray(messages) && typeof messages[0] === 'string')
        fields[key] = messages[0]
    }
  const messages: Record<number, string> = {
    401: 'Tu sesión expiró. Inicia sesión nuevamente.',
    403: 'Solo el docente responsable autorizado puede gestionar expulsiones de este examen.',
    404: 'No se encontró el registro o la función aún no está disponible.',
    409: 'El estudiante ya tiene una expulsión vigente o la información cambió. Consulta el listado.',
    422: 'Revisa los datos de la expulsión.',
    501: 'La gestión de expulsiones aún no está disponible en el servidor.',
  }
  throw new InfractionApiError(
    (status && messages[status]) ||
      'No se pudo confirmar la operación. Consulta el listado antes de repetirla.',
    status,
    fields,
  )
}
export function validateExpulsion(p: ExpulsionPayload): Record<string, string> {
  const e: Record<string, string> = {}
  if (!positiveId(p.student_id))
    e.student_id = 'Selecciona un estudiante del examen.'
  if (typeof p.reason !== 'string' || !p.reason.trim())
    e.reason = 'El motivo de expulsión es obligatorio.'
  if (p.infraction_id !== null && !positiveId(p.infraction_id))
    e.infraction_id = 'Selecciona una infracción válida o ninguna.'
  if (p.confirmed !== true) e.confirmed = 'Confirma la decisión de expulsión.'
  return e
}
export function readRelated(
  v: RelatedInfraction,
  exam: number,
  student: number,
) {
  if (
    !v ||
    !positiveId(v.id) ||
    v.exam_id !== exam ||
    v.student_id !== student ||
    !isInfractionType(v.type) ||
    !isInfractionStatus(v.status) ||
    typeof v.description !== 'string' ||
    !v.description.trim()
  )
    invalid()
  return v
}
export function readExpulsion(v: Expulsion, exam: number): Expulsion {
  const s = v?.student
  if (
    !v ||
    !positiveId(v.id) ||
    v.exam_id !== exam ||
    !s ||
    !positiveId(s.id) ||
    typeof s.first_names !== 'string' ||
    !s.first_names.trim() ||
    typeof s.last_names !== 'string' ||
    typeof s.sis_code !== 'string' ||
    (s.identity_number !== null && typeof s.identity_number !== 'string') ||
    v.status !== 'EXPELLED' ||
    typeof v.reason !== 'string' ||
    !v.reason.trim() ||
    !isTimestamp(v.expelled_at) ||
    !v.expelled_by ||
    !positiveId(v.expelled_by.id) ||
    typeof v.expelled_by.name !== 'string' ||
    !v.expelled_by.name.trim()
  )
    invalid()
  if (v.infraction !== null) readRelated(v.infraction, exam, s.id)
  return v
}
export async function getExpulsions(
  exam: number,
  page = 1,
  signal?: AbortSignal,
): Promise<ExpulsionPage> {
  const url = endpoint(exam)
  check(page)
  try {
    const { data } = await httpClient.get<ExpulsionPage>(url, {
      params: { page, per_page: 10 },
      signal,
    })
    readInfractionExam(data?.exam, exam)
    if (
      typeof data.permissions?.can_create !== 'boolean' ||
      !Array.isArray(data.data) ||
      new Set(data.data.map((v) => v?.id)).size !== data.data.length ||
      new Set(data.data.map((v) => v?.student?.id)).size !== data.data.length
    )
      invalid()
    readInfractionMeta(data.meta, page, data.data.length)
    data.data.forEach((v) => readExpulsion(v, exam))
    return data
  } catch (cause) {
    return failure(cause)
  }
}
export async function getExpulsion(
  exam: number,
  id: number,
  signal?: AbortSignal,
): Promise<ExpulsionDetail> {
  const url = endpoint(exam)
  check(id)
  try {
    const { data } = await httpClient.get<ExpulsionDetail>(`${url}/${id}`, {
      signal,
    })
    readInfractionExam(data?.exam, exam)
    readExpulsion(data.data, exam)
    if (data.data.id !== id) invalid()
    return data
  } catch (cause) {
    return failure(cause)
  }
}
export async function createExpulsion(
  exam: number,
  p: ExpulsionPayload,
): Promise<Expulsion> {
  const url = endpoint(exam)
  const errors = validateExpulsion(p)
  if (Object.keys(errors).length)
    throw new InfractionApiError(
      'Revisa la expulsión antes de confirmar.',
      422,
      errors,
    )
  try {
    const { data } = await httpClient.post<{ data: Expulsion }>(url, {
      student_id: p.student_id,
      reason: p.reason.trim(),
      infraction_id: p.infraction_id,
    })
    const v = readExpulsion(data?.data, exam)
    if (
      v.student.id !== p.student_id ||
      v.reason !== p.reason.trim() ||
      (v.infraction?.id ?? null) !== p.infraction_id
    )
      invalid()
    return v
  } catch (cause) {
    return failure(cause)
  }
}
export async function getRelatedInfractions(
  exam: number,
  student: number,
  page = 1,
  signal?: AbortSignal,
): Promise<{
  context: { exam_id: number; student_id: number }
  data: RelatedInfraction[]
  meta: ExpulsionPage['meta']
}> {
  const url = endpoint(exam)
  check(student, page)
  try {
    const { data } = await httpClient.get<{
      context: { exam_id: number; student_id: number }
      data: RelatedInfraction[]
      meta: ExpulsionPage['meta']
    }>(`${url}/eligible-infractions`, {
      params: { student_id: student, page, per_page: 10 },
      signal,
    })
    if (
      data?.context?.exam_id !== exam ||
      data.context.student_id !== student ||
      !Array.isArray(data.data) ||
      new Set(data.data.map((v) => v?.id)).size !== data.data.length
    )
      invalid()
    readInfractionMeta(data.meta, page, data.data.length)
    data.data.forEach((v) => readRelated(v, exam, student))
    return data
  } catch (cause) {
    return failure(cause)
  }
}
export async function getExpulsionHistory(
  exam: number,
  student: number,
  page = 1,
  signal?: AbortSignal,
): Promise<ExpulsionHistory> {
  endpoint(exam)
  check(student, page)
  try {
    const { data } = await httpClient.get<ExpulsionHistory>(
      `/exams/${exam}/students/${student}/expulsions`,
      { params: { page, per_page: 10 }, signal },
    )
    if (
      data?.context?.exam_id !== exam ||
      data.context.student_id !== student ||
      !Array.isArray(data.data) ||
      new Set(data.data.map((v) => v?.expulsion?.id)).size !== data.data.length
    )
      invalid()
    readInfractionMeta(data.meta, page, data.data.length)
    data.data.forEach((v) => {
      readInfractionExam(v.exam, v.expulsion.exam_id)
      readExpulsion(v.expulsion, v.exam.id)
      if (v.expulsion.student.id !== student) invalid()
    })
    return data
  } catch (cause) {
    return failure(cause)
  }
}
