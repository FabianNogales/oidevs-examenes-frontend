import type {
  ChangeInfractionStatusPayload,
  CreateInfractionPayload,
  Infraction,
  InfractionFieldErrors,
  InfractionStatus,
  InfractionType,
} from '../types/infraction.types'

export const INFRACTION_TYPE_LABELS: Record<InfractionType, string> = {
  COPYING: 'Copia',
  CHEATING: 'Trampa',
  IMPERSONATION: 'Suplantación de identidad',
}
export const INFRACTION_STATUS_LABELS: Record<InfractionStatus, string> = {
  REPORTED: 'Reportada',
  CONFIRMED: 'Confirmada',
  RESOLVED: 'Resuelta',
}
export const positiveId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
export const isInfractionType = (value: unknown): value is InfractionType =>
  typeof value === 'string' && Object.hasOwn(INFRACTION_TYPE_LABELS, value)
export const isInfractionStatus = (value: unknown): value is InfractionStatus =>
  typeof value === 'string' && Object.hasOwn(INFRACTION_STATUS_LABELS, value)
export const isTimestamp = (value: unknown): value is string =>
  typeof value === 'string' &&
  /(Z|[+-]\d{2}:\d{2})$/.test(value) &&
  !Number.isNaN(Date.parse(value))

export function validateInfraction(
  payload: CreateInfractionPayload,
): InfractionFieldErrors {
  const errors: InfractionFieldErrors = {}
  if (!positiveId(payload.student_id))
    errors.student_id = 'Selecciona un estudiante del examen.'
  if (!isInfractionType(payload.type))
    errors.type = 'Selecciona un tipo de infracción.'
  if (typeof payload.description !== 'string' || !payload.description.trim())
    errors.description = 'Describe lo ocurrido.'
  if (typeof payload.observations !== 'string')
    errors.observations = 'Ingresa observaciones válidas o deja el campo vacío.'
  return errors
}

export function validateInfractionChange(
  record: Infraction,
  payload: ChangeInfractionStatusPayload,
): InfractionFieldErrors {
  const errors: InfractionFieldErrors = {}
  if (
    !isInfractionStatus(payload.status) ||
    payload.status === record.status ||
    !record.permissions.can_update ||
    !record.permissions.allowed_statuses.includes(payload.status)
  )
    errors.status =
      'Selecciona una operación autorizada para el estado vigente.'
  if (typeof payload.reason !== 'string' || !payload.reason.trim())
    errors.reason = 'Justifica el cambio de estado.'
  if (payload.confirmed !== true)
    errors.confirmed = 'Confirma explícitamente el cambio de estado.'
  return errors
}
