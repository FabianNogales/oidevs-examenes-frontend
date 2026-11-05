import type {
  IncidentConsultationErrors,
  IncidentConsultationQuery,
} from '../types/incidentConsultation.types'
import { isIncidentType, isPositiveId } from './incidentValidation'

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const date = new Date(value + 'T00:00:00Z')
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export function validateIncidentConsultation(
  query: IncidentConsultationQuery,
): IncidentConsultationErrors {
  const errors: IncidentConsultationErrors = {}
  if (typeof query.search !== 'string')
    errors.search = 'Ingresa una búsqueda válida.'
  if (query.type !== '' && !isIncidentType(query.type))
    errors.type = 'Selecciona un tipo de incidencia válido.'
  if (typeof query.status !== 'string')
    errors.status = 'Selecciona un estado válido.'
  if (!isPositiveId(query.page)) errors.page = 'La página no es válida.'
  for (const field of ['date_from', 'date_to'] as const)
    if (query[field] !== '' && !isDate(query[field]))
      errors[field] = 'Ingresa una fecha válida.'
  if (
    !errors.date_from &&
    !errors.date_to &&
    query.date_from &&
    query.date_to &&
    query.date_from > query.date_to
  )
    errors.date_to = 'La fecha final debe ser igual o posterior a la inicial.'
  return errors
}

export function incidentConsultationParams(query: IncidentConsultationQuery) {
  return {
    search: query.search.trim() || undefined,
    type: query.type || undefined,
    status: query.status.trim() || undefined,
    date_from: query.date_from || undefined,
    date_to: query.date_to || undefined,
  }
}
