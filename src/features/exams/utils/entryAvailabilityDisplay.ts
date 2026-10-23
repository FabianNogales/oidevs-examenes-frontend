import type { EntryBlocker } from '../types/entryControl.types'

const UNAVAILABLE_MESSAGE =
  'El examen no está disponible para registrar ingresos.'

// Global unavailability reasons are supplied by the backend.
// Availability itself always comes from the API, never from dates or status here.
export function entryUnavailableReasonMessage(reason: string | null): string {
  switch (reason) {
    case 'EXAM_NOT_STARTED':
      return 'El examen todavía no comenzó. Los ingresos estarán disponibles desde la hora programada.'
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

export function entryBlockerMessage(blocker: EntryBlocker): string {
  if (blocker.code !== 'EXAM_UNAVAILABLE') return blocker.message
  // A student blocker does not identify the exam's global unavailability reason.
  return entryAvailabilityMessage(blocker.message.trim()) || UNAVAILABLE_MESSAGE
}
