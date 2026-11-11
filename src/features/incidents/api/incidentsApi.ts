import axios from 'axios'
import type { IncidentConsultationFilters } from '../types/incidentConsultation.types'
import { httpClient } from '@/shared/api/httpClient'
import type {
  CreateIncidentPayload,
  Incident,
  IncidentFieldErrors,
  IncidentsPage,
} from '../types/incident.types'
import {
  isIncidentType,
  isPositiveId,
  validateIncident,
} from '../utils/incidentValidation'

export class IncidentApiError extends Error {
  readonly status: number | null
  readonly fieldErrors: IncidentFieldErrors

  constructor(
    message: string,
    status: number | null = null,
    fieldErrors: IncidentFieldErrors = {},
  ) {
    super(message)
    this.name = 'IncidentApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export async function getIncidents(
  examId: number,
  page = 1,
  signal?: AbortSignal,
  filters?: Partial<IncidentConsultationFilters>,
): Promise<IncidentsPage> {
  const url = endpoint(examId)
  if (!isPositiveId(page)) throw new IncidentApiError('La página no es válida.')
  try {
    const response = await httpClient.get<IncidentsPage>(url, {
      params: {
        page,
        per_page: 10,
        ...(filters
          ? {
              search: filters.search,
              type: filters.type,
              status: filters.status,
              date_from: filters.date_from,
              date_to: filters.date_to,
            }
          : {}),
      },
      signal,
    })
    const result = response.data
    const meta = result?.meta
    if (
      result?.exam?.id !== examId ||
      typeof result.exam.name !== 'string' ||
      typeof result.exam.subject_name !== 'string' ||
      typeof result.permissions?.can_create !== 'boolean' ||
      !Array.isArray(result.data) ||
      !meta ||
      meta.current_page !== page ||
      !isPositiveId(meta.last_page) ||
      !isPositiveId(meta.per_page) ||
      meta.per_page > 100 ||
      !Number.isSafeInteger(meta.total) ||
      meta.total < 0 ||
      meta.last_page !== Math.max(1, Math.ceil(meta.total / meta.per_page)) ||
      meta.current_page > meta.last_page ||
      result.data.length !==
        Math.min(
          meta.per_page,
          Math.max(0, meta.total - (page - 1) * meta.per_page),
        ) ||
      new Set(result.data.map((item) => item?.id)).size !== result.data.length
    )
      throw new IncidentApiError(
        'El servidor devolvió un listado de incidencias inválido. Vuelve a intentarlo.',
      )
    result.data.forEach((item) => readIncident(item, examId))
    return result
  } catch (error) {
    return mapError(error)
  }
}

function endpoint(examId: number): string {
  if (!isPositiveId(examId))
    throw new IncidentApiError('El identificador del examen no es válido.')
  return `/exams/${examId}/incidents`
}

function readIncident(value: unknown, examId: number): Incident {
  const item = value as Incident | null
  const student = item?.student
  if (
    !item ||
    !isPositiveId(item.id) ||
    item.exam_id !== examId ||
    !isIncidentType(item.type) ||
    typeof item.description !== 'string' ||
    !item.description.trim() ||
    !['MANUAL', 'AUTOMATIC'].includes(item.origin) ||
    typeof item.status !== 'string' ||
    !item.status.trim() ||
    !isPositiveId(item.reported_by?.id) ||
    typeof item.reported_by?.name !== 'string' ||
    !item.reported_by.name.trim() ||
    typeof item.created_at !== 'string' ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(item.created_at) ||
    Number.isNaN(Date.parse(item.created_at)) ||
    (student !== null &&
      (!student ||
        !isPositiveId(student.id) ||
        typeof student.first_names !== 'string' ||
        typeof student.last_names !== 'string' ||
        typeof student.sis_code !== 'string' ||
        (student.identity_number !== null &&
          typeof student.identity_number !== 'string')))
  )
    throw new IncidentApiError(
      'El servidor devolvió una incidencia incompleta o de otro examen. Vuelve a consultar antes de repetir el registro.',
    )
  return item
}

function mapError(error: unknown): never {
  if (error instanceof IncidentApiError || axios.isCancel(error)) throw error
  const status = axios.isAxiosError(error)
    ? (error.response?.status ?? null)
    : null
  const fields: IncidentFieldErrors = {}
  if (axios.isAxiosError(error) && status === 422) {
    const errors = error.response?.data?.errors
    for (const field of ['type', 'description', 'student_id'] as const) {
      const messages: unknown = errors?.[field]
      if (Array.isArray(messages) && typeof messages[0] === 'string')
        fields[field] = messages[0]
    }
  }
  const messages: Record<number, string> = {
    401: 'Tu sesión expiró. Inicia sesión nuevamente.',
    403: 'No tienes autorización vigente para acceder a las incidencias de este examen.',
    404: 'No se encontró el recurso de incidencias solicitado.',
    409: 'La información cambió o el evento ya fue registrado. Actualiza antes de continuar.',
    422: 'Revisa los campos de la incidencia.',
    501: 'El servidor aún no tiene disponible la gestión de incidencias.',
  }
  throw new IncidentApiError(
    (status && messages[status]) ||
      'No se pudo completar la operación. Comprueba el registro antes de reenviarlo.',
    status,
    fields,
  )
}

export async function createIncident(
  examId: number,
  payload: CreateIncidentPayload,
  signal?: AbortSignal,
): Promise<Incident> {
  const url = endpoint(examId)
  const fields = validateIncident(payload)
  if (Object.keys(fields).length)
    throw new IncidentApiError(
      'Revisa los campos de la incidencia.',
      422,
      fields,
    )
  try {
    const response = await httpClient.post<{ data: Incident }>(
      url,
      {
        type: payload.type,
        description: payload.description.trim(),
        student_id: payload.student_id,
      },
      { signal },
    )
    const incident = readIncident(response.data?.data, examId)
    if (
      incident.origin !== 'MANUAL' ||
      incident.type !== payload.type ||
      (incident.student?.id ?? null) !== payload.student_id
    )
      throw new IncidentApiError(
        'La respuesta no corresponde al reporte manual enviado. Consulta el registro antes de reenviarlo.',
      )
    return incident
  } catch (error) {
    return mapError(error)
  }
}

export async function getIncident(
  examId: number,
  incidentId: number,
  signal?: AbortSignal,
): Promise<Incident> {
  const url = endpoint(examId)
  if (!isPositiveId(incidentId))
    throw new IncidentApiError(
      'El identificador de la incidencia no es válido.',
    )
  try {
    const response = await httpClient.get<{ data: Incident }>(
      `${url}/${incidentId}`,
      { signal },
    )
    const incident = readIncident(response.data?.data, examId)
    if (incident.id !== incidentId)
      throw new IncidentApiError(
        'El servidor devolvió una incidencia distinta de la solicitada.',
      )
    return incident
  } catch (error) {
    return mapError(error)
  }
}
