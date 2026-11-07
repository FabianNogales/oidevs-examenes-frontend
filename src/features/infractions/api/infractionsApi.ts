import { httpClient } from '@/shared/api/httpClient'
import type {
  ChangeInfractionStatusPayload,
  CreateInfractionPayload,
  Infraction,
  InfractionDetail,
  InfractionPage,
  StudentInfractionsPage,
} from '../types/infraction.types'
import {
  positiveId,
  validateInfraction,
  validateInfractionChange,
} from '../utils/infractionValidation'
import { InfractionApiError, mapInfractionError } from './infractionErrors'
import {
  readInfraction,
  readInfractionDetail,
  readInfractionExam,
  readInfractionMeta,
} from './infractionResponse'

function endpoint(examId: number): string {
  if (!positiveId(examId))
    throw new InfractionApiError('El identificador del examen no es válido.')
  return `/exams/${examId}/infractions`
}
function checkId(id: number) {
  if (!positiveId(id))
    throw new InfractionApiError('El identificador solicitado no es válido.')
}

export async function getInfractions(
  examId: number,
  page = 1,
  signal?: AbortSignal,
): Promise<InfractionPage> {
  const url = endpoint(examId)
  checkId(page)
  try {
    const { data: result } = await httpClient.get<InfractionPage>(url, {
      params: { page, per_page: 10 },
      signal,
    })
    readInfractionExam(result?.exam, examId)
    if (
      typeof result.permissions?.can_create !== 'boolean' ||
      !Array.isArray(result.data) ||
      new Set(result.data.map((item) => item?.id)).size !== result.data.length
    )
      throw new InfractionApiError('El listado de infracciones no es válido.')
    readInfractionMeta(result.meta, page, result.data.length)
    result.data.forEach((item) => readInfraction(item, examId))
    return result
  } catch (cause) {
    return mapInfractionError(cause)
  }
}

export async function createInfraction(
  examId: number,
  payload: CreateInfractionPayload,
): Promise<Infraction> {
  const url = endpoint(examId)
  const errors = validateInfraction(payload)
  if (Object.keys(errors).length)
    throw new InfractionApiError(
      'Revisa los campos de la infracción.',
      422,
      errors,
    )
  try {
    const { data } = await httpClient.post<{ data: Infraction }>(url, {
      student_id: payload.student_id,
      type: payload.type,
      description: payload.description.trim(),
      observations: payload.observations.trim() || null,
    })
    const result = readInfraction(data?.data, examId)
    if (
      result.status !== 'REPORTED' ||
      result.student.id !== payload.student_id ||
      result.type !== payload.type ||
      result.description !== payload.description.trim() ||
      result.observations !== (payload.observations.trim() || null)
    )
      throw new InfractionApiError(
        'La respuesta no confirma el reporte enviado. Consulta el registro antes de repetirlo.',
      )
    return result
  } catch (cause) {
    return mapInfractionError(cause)
  }
}

export async function getInfraction(
  examId: number,
  id: number,
  signal?: AbortSignal,
): Promise<InfractionDetail> {
  const url = endpoint(examId)
  checkId(id)
  try {
    const { data } = await httpClient.get<InfractionDetail>(`${url}/${id}`, {
      signal,
    })
    return readInfractionDetail(data, examId, id)
  } catch (cause) {
    return mapInfractionError(cause)
  }
}

export async function getStudentInfractions(
  examId: number,
  studentId: number,
  page = 1,
  signal?: AbortSignal,
): Promise<StudentInfractionsPage> {
  endpoint(examId)
  checkId(studentId)
  checkId(page)
  try {
    const { data } = await httpClient.get<StudentInfractionsPage>(
      `/exams/${examId}/students/${studentId}/infractions`,
      { params: { page, per_page: 10 }, signal },
    )
    if (
      data?.context?.exam_id !== examId ||
      data.context.student_id !== studentId ||
      !Array.isArray(data.data) ||
      new Set(data.data.map((item) => item?.infraction?.id)).size !==
        data.data.length
    )
      throw new InfractionApiError(
        'El historial no corresponde al estudiante y examen solicitados.',
      )
    readInfractionMeta(data.meta, page, data.data.length)
    data.data.forEach((item) => {
      readInfractionExam(item.exam, item.infraction.exam_id)
      readInfraction(item.infraction, item.exam.id)
      if (item.infraction.student.id !== studentId)
        throw new InfractionApiError(
          'El historial incluye registros de otro estudiante.',
        )
    })
    return data
  } catch (cause) {
    return mapInfractionError(cause)
  }
}

export async function changeInfractionStatus(
  examId: number,
  original: InfractionDetail,
  payload: ChangeInfractionStatusPayload,
): Promise<InfractionDetail> {
  const url = endpoint(examId)
  readInfractionDetail(original, examId, original.data.id)
  const errors = validateInfractionChange(original.data, payload)
  if (Object.keys(errors).length)
    throw new InfractionApiError(
      'Revisa la operación y su justificación.',
      original.data.permissions.can_update ? 422 : 403,
      errors,
    )
  try {
    const { data } = await httpClient.patch<InfractionDetail>(
      `${url}/${original.data.id}/status`,
      {
        status: payload.status,
        reason: payload.reason.trim(),
        expected_updated_at: original.data.updated_at,
      },
    )
    const result = readInfractionDetail(data, examId, original.data.id)
    const before = original.data,
      after = result.data
    const event = result.history.at(-1)
    if (
      after.status !== payload.status ||
      after.student.id !== before.student.id ||
      after.type !== before.type ||
      after.description !== before.description ||
      after.observations !== before.observations ||
      after.occurred_at !== before.occurred_at ||
      after.reported_by.id !== before.reported_by.id ||
      after.reported_by.name !== before.reported_by.name ||
      after.updated_at === before.updated_at ||
      Date.parse(after.updated_at) < Date.parse(before.updated_at) ||
      result.history.length !== original.history.length + 1 ||
      original.history.some((previous, index) => {
        const current = result.history[index]
        return (
          previous.id !== current.id ||
          previous.action !== current.action ||
          previous.from_status !== current.from_status ||
          previous.to_status !== current.to_status ||
          previous.reason !== current.reason ||
          previous.performed_at !== current.performed_at ||
          previous.performed_by.id !== current.performed_by.id ||
          previous.performed_by.name !== current.performed_by.name
        )
      }) ||
      event?.action !== 'STATUS_CHANGED' ||
      event.reason !== payload.reason.trim()
    )
      throw new InfractionApiError(
        'La respuesta no conserva la evidencia y trazabilidad del cambio. Actualiza antes de repetir la operación.',
      )
    return result
  } catch (cause) {
    return mapInfractionError(cause)
  }
}
