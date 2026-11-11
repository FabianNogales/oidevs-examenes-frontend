import type {
  AnnulEntryErrors,
  AnnulEntryPayload,
  AnnulmentHistoryRecord,
} from '../types/entryAnnulment.types'

export function canAnnulEntry(record: AnnulmentHistoryRecord): boolean {
  return (
    record.permissions?.can_annul === true &&
    record.entry.status === 'VALID' &&
    !record.entry.annulment
  )
}

export function validateEntryAnnulment(
  payload: AnnulEntryPayload,
): AnnulEntryErrors {
  const errors: AnnulEntryErrors = {}
  if (typeof payload.reason !== 'string' || !payload.reason.trim())
    errors.reason = 'Escribe el motivo de la anulación.'
  if (payload.confirmed !== true)
    errors.confirmed = 'Confirma explícitamente la anulación del ingreso.'
  return errors
}
