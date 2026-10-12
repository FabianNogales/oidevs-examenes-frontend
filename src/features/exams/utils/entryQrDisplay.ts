import type { EntryQrResult } from '../types/entryQr.types'

export const ENTRY_QR_LABELS: Record<EntryQrResult, string> = {
  AUTHORIZED: 'INGRESO AUTORIZADO',
  INVALID_QR: 'QR INVÁLIDO',
  WRONG_EXAM: 'QR DE OTRO EXAMEN',
  DENIED: 'INGRESO NO AUTORIZADO',
  ALREADY_REGISTERED: 'INGRESO YA REGISTRADO',
}

export function entryQrTone(
  result: EntryQrResult,
): 'positive' | 'negative' | 'pending' {
  if (result === 'AUTHORIZED') return 'positive'
  if (result === 'ALREADY_REGISTERED') return 'pending'
  return 'negative'
}
