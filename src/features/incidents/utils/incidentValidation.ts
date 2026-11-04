import type {
  CreateIncidentPayload,
  IncidentFieldErrors,
  IncidentType,
} from '../types/incident.types'

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  IDENTIFICATION: 'Problema de identificación',
  SUSPECTED_IMPERSONATION: 'Presunta suplantación',
  INELIGIBILITY: 'Estudiante no habilitado',
  WRONG_EXAM: 'QR de otro examen',
  ENVIRONMENT: 'Problema del ambiente',
}

export function isPositiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

export function isIncidentType(value: unknown): value is IncidentType {
  return typeof value === 'string' && Object.hasOwn(INCIDENT_TYPE_LABELS, value)
}

export function validateIncident(
  payload: CreateIncidentPayload,
): IncidentFieldErrors {
  const errors: IncidentFieldErrors = {}
  if (!isIncidentType(payload.type))
    errors.type = 'Selecciona un tipo de incidencia.'
  if (typeof payload.description !== 'string' || !payload.description.trim())
    errors.description = 'Describe lo ocurrido.'
  if (payload.student_id !== null && !isPositiveId(payload.student_id))
    errors.student_id =
      'Selecciona un estudiante válido o registra sin identificar.'
  return errors
}
