import type { EntryBlocker } from '../types/entryControl.types'

const UNAVAILABLE_MESSAGE =
  'El examen no está disponible para registrar ingresos.'

// Reasons documented by the backend in docs/EXAM_ENTRY_AVAILABILITY.md.
// Availability itself always comes from the API, never from dates or status here.
export function entryUnavailableReasonMessage(reason: string | null): string {
  switch (reason) {
    case 'EXAM_ENDED':
    case 'EXAM_FINISHED':
      return 'El examen ya finalizó. No se pueden registrar nuevos ingresos.'
    case 'EXAM_CANCELLED':
      return 'El examen fue cancelado. No se pueden registrar nuevos ingresos.'
    case 'EXAM_STATE_NOT_ALLOWED':
      return 'El estado actual del examen no permite registrar ingresos.'
    default:
      return 'El examen no se encuentra disponible para registrar ingresos en este momento.'
  }
}

export function entryAvailabilityMessage(message: string): string {
  return message.replaceAll('EXAM_UNAVAILABLE', UNAVAILABLE_MESSAGE)
}

export function entryBlockerMessage(
  blocker: EntryBlocker,
  reason?: string | null,
): string {
  if (blocker.code !== 'EXAM_UNAVAILABLE') return blocker.message
  switch (reason) {
    case 'EXAM_ENDED':
    case 'EXAM_FINISHED':
      return 'El examen ya finalizó.'
    case 'EXAM_CANCELLED':
      return 'El examen fue cancelado.'
    case 'EXAM_STATE_NOT_ALLOWED':
      return entryUnavailableReasonMessage(reason)
    default:
      return (
        entryAvailabilityMessage(blocker.message.trim()) || UNAVAILABLE_MESSAGE
      )
  }
}
