import type { EntryProcessingResult } from '../types/entryRegistration.types'

export const ENTRY_RESULT_LABELS: Record<EntryProcessingResult, string> = {
  AUTHORIZED: 'INGRESO AUTORIZADO',
  INVALID_QR: 'QR INVÁLIDO',
  WRONG_EXAM: 'QR DE OTRO EXAMEN',
  DENIED: 'INGRESO NO AUTORIZADO',
  ALREADY_REGISTERED: 'INGRESO YA REGISTRADO',
}

export function entryResultTone(
  result: EntryProcessingResult,
): 'positive' | 'negative' | 'pending' {
  if (result === 'AUTHORIZED') return 'positive'
  if (result === 'ALREADY_REGISTERED') return 'pending'
  return 'negative'
}
