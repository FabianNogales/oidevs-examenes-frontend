import type {
  Infraction,
  InfractionActor,
  InfractionDetail,
  InfractionExam,
  InfractionMeta,
} from '../types/infraction.types'
import {
  isInfractionStatus,
  isInfractionType,
  isTimestamp,
  positiveId,
} from '../utils/infractionValidation'
import { InfractionApiError } from './infractionErrors'

function invalid(): never {
  throw new InfractionApiError(
    'El servidor devolvió información incompleta o ajena al registro solicitado. Actualiza antes de repetir la operación.',
  )
}
function actor(value: InfractionActor | null): boolean {
  return (
    !!value &&
    positiveId(value.id) &&
    typeof value.name === 'string' &&
    !!value.name.trim()
  )
}

export function readInfractionExam(
  value: InfractionExam,
  examId: number,
): InfractionExam {
  if (
    !value ||
    value.id !== examId ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    typeof value.subject_name !== 'string' ||
    !value.subject_name.trim()
  )
    invalid()
  return value
}
export function readInfraction(value: Infraction, examId: number): Infraction {
  const student = value?.student
  const permissions = value?.permissions
  if (
    !value ||
    !positiveId(value.id) ||
    value.exam_id !== examId ||
    !positiveId(value.exam_id) ||
    !student ||
    !positiveId(student.id) ||
    typeof student.first_names !== 'string' ||
    typeof student.last_names !== 'string' ||
    typeof student.sis_code !== 'string' ||
    (student.identity_number !== null &&
      typeof student.identity_number !== 'string') ||
    !isInfractionType(value.type) ||
    !isInfractionStatus(value.status) ||
    typeof value.description !== 'string' ||
    !value.description.trim() ||
    (value.observations !== null && typeof value.observations !== 'string') ||
    !isTimestamp(value.occurred_at) ||
    !isTimestamp(value.updated_at) ||
    Date.parse(value.updated_at) < Date.parse(value.occurred_at) ||
    !actor(value.reported_by) ||
    !permissions ||
    typeof permissions.can_update !== 'boolean' ||
    !Array.isArray(permissions.allowed_statuses) ||
    permissions.allowed_statuses.some(
      (status) => !isInfractionStatus(status) || status === value.status,
    ) ||
    new Set(permissions.allowed_statuses).size !==
      permissions.allowed_statuses.length ||
    (!permissions.can_update && permissions.allowed_statuses.length > 0)
  )
    invalid()
  return value
}
export function readInfractionMeta(
  meta: InfractionMeta,
  page: number,
  size: number,
): void {
  if (
    !meta ||
    meta.current_page !== page ||
    !positiveId(meta.last_page) ||
    !positiveId(meta.per_page) ||
    meta.per_page > 100 ||
    !Number.isSafeInteger(meta.total) ||
    meta.total < 0 ||
    meta.last_page !== Math.max(1, Math.ceil(meta.total / meta.per_page)) ||
    page > meta.last_page ||
    size !==
      Math.min(
        meta.per_page,
        Math.max(0, meta.total - (page - 1) * meta.per_page),
      )
  )
    invalid()
}
export function readInfractionDetail(
  result: InfractionDetail,
  examId: number,
  id: number,
): InfractionDetail {
  if (!result) invalid()
  readInfractionExam(result.exam, examId)
  readInfraction(result.data, examId)
  if (
    result.data.id !== id ||
    !Array.isArray(result.history) ||
    !result.history.length ||
    new Set(result.history.map((event) => event?.id)).size !==
      result.history.length
  )
    invalid()
  let previous = null
  for (const event of result.history) {
    if (
      !event ||
      !positiveId(event.id) ||
      !['CREATED', 'STATUS_CHANGED', 'UPDATED'].includes(event.action) ||
      !isInfractionStatus(event.to_status) ||
      (event.from_status !== null && !isInfractionStatus(event.from_status)) ||
      !actor(event.performed_by) ||
      !isTimestamp(event.performed_at) ||
      (event.reason !== null && typeof event.reason !== 'string') ||
      (!previous &&
        (event.action !== 'CREATED' ||
          event.from_status !== null ||
          event.to_status !== 'REPORTED' ||
          event.performed_by.id !== result.data.reported_by.id)) ||
      (previous &&
        (event.action === 'CREATED' ||
          event.from_status !== previous.to_status ||
          Date.parse(event.performed_at) <
            Date.parse(previous.performed_at))) ||
      (event.action === 'STATUS_CHANGED' &&
        (event.from_status === event.to_status || !event.reason?.trim())) ||
      (event.action === 'UPDATED' && event.from_status !== event.to_status)
    )
      invalid()
    previous = event
  }
  if (previous?.to_status !== result.data.status) invalid()
  return result
}
