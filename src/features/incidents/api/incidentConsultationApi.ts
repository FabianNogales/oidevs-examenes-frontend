import { getIncidents, IncidentApiError } from './incidentsApi'
import type {
  IncidentConsultationErrors,
  IncidentConsultationPage,
  IncidentConsultationQuery,
} from '../types/incidentConsultation.types'
import {
  incidentConsultationParams,
  validateIncidentConsultation,
} from '../utils/incidentConsultationValidation'
import { INCIDENT_TYPE_LABELS } from '../utils/incidentValidation'
import type { IncidentType } from '../types/incident.types'

export class IncidentConsultationApiError extends Error {
  readonly fieldErrors: IncidentConsultationErrors
  constructor(message: string, fieldErrors: IncidentConsultationErrors = {}) {
    super(message)
    this.name = 'IncidentConsultationApiError'
    this.fieldErrors = fieldErrors
  }
}

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function boliviaDate(timestamp: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp))
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join('-')
}

export async function getIncidentConsultation(
  examId: number,
  query: IncidentConsultationQuery,
  signal?: AbortSignal,
): Promise<IncidentConsultationPage> {
  const errors = validateIncidentConsultation(query)
  if (Object.keys(errors).length)
    throw new IncidentConsultationApiError(
      'Revisa los filtros de búsqueda.',
      errors,
    )
  // Reuse HU27 transport, scope validation, pagination and session handling.
  const page = await getIncidents(
    examId,
    query.page,
    signal,
    incidentConsultationParams(query),
  )
  const result = page as IncidentConsultationPage
  const summary = result.summary
  const statuses = result.filters?.statuses
  const types = Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[]
  if (
    typeof result.permissions.can_export !== 'boolean' ||
    !summary ||
    !count(summary.total) ||
    summary.total !== page.meta.total ||
    !summary.by_type ||
    types.some((type) => !count(summary.by_type[type])) ||
    types.reduce((sum, type) => sum + summary.by_type[type], 0) !==
      summary.total ||
    !Array.isArray(statuses) ||
    statuses.some(
      (status) =>
        !status ||
        typeof status.value !== 'string' ||
        !status.value.trim() ||
        typeof status.label !== 'string' ||
        !status.label.trim(),
    ) ||
    new Set(statuses.map((status) => status.value)).size !== statuses.length
  )
    throw new IncidentConsultationApiError(
      'El servidor no proporcionó los permisos, estados o contadores completos de la consulta.',
    )
  const selectedType = query.type
  if (
    result.data.some(
      (item) =>
        (selectedType && item.type !== selectedType) ||
        (query.status.trim() && item.status !== query.status.trim()) ||
        (query.date_from && boliviaDate(item.created_at) < query.date_from) ||
        (query.date_to && boliviaDate(item.created_at) > query.date_to),
    ) ||
    types.some(
      (type) =>
        result.data.filter((item) => item.type === type).length >
        summary.by_type[type],
    )
  )
    throw new IncidentApiError(
      'El servidor devolvió incidencias que no corresponden a los filtros aplicados.',
    )
  return result
}
