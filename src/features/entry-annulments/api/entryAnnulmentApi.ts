import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type {
  AnnulEntryErrors,
  AnnulEntryPayload,
  AnnulmentHistoryRecord,
} from '../types/entryAnnulment.types'
import {
  canAnnulEntry,
  validateEntryAnnulment,
} from '../utils/entryAnnulmentValidation'

export class EntryAnnulmentApiError extends Error {
  readonly status: number | null
  readonly fieldErrors: AnnulEntryErrors

  constructor(
    message: string,
    status: number | null = null,
    fieldErrors: AnnulEntryErrors = {},
  ) {
    super(message)
    this.name = 'EntryAnnulmentApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function positiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function timestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /(Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  )
}

function mapError(error: unknown): never {
  if (error instanceof EntryAnnulmentApiError || axios.isCancel(error))
    throw error
  const status = axios.isAxiosError(error)
    ? (error.response?.status ?? null)
    : null
  const reason = axios.isAxiosError(error)
    ? error.response?.data?.errors?.reason
    : null
  const messages: Record<number, string> = {
    401: 'Tu sesión expiró. Inicia sesión nuevamente.',
    403: 'Solo el docente responsable autorizado puede anular este ingreso.',
    404: 'No se encontró el ingreso solicitado o la función aún no está disponible.',
    409: 'El ingreso cambió o ya fue anulado. Actualiza el historial antes de continuar.',
    422: 'Revisa el motivo de la anulación.',
    501: 'El servidor todavía no tiene disponible la anulación de ingresos.',
  }
  throw new EntryAnnulmentApiError(
    (status && messages[status]) ||
      'No se pudo confirmar la anulación. Consulta el historial antes de volver a intentarlo.',
    status,
    status === 422 && Array.isArray(reason) && typeof reason[0] === 'string'
      ? { reason: reason[0] }
      : {},
  )
}

export async function annulEntry(
  examId: number,
  original: AnnulmentHistoryRecord,
  payload: AnnulEntryPayload,
): Promise<AnnulmentHistoryRecord> {
  if (
    !positiveId(examId) ||
    !positiveId(original.entry.id) ||
    original.entry.exam_id !== examId ||
    !positiveId(original.student.student_id) ||
    original.entry.student_id !== original.student.student_id
  )
    throw new EntryAnnulmentApiError(
      'El ingreso no corresponde al examen y estudiante seleccionados.',
    )
  if (!canAnnulEntry(original))
    throw new EntryAnnulmentApiError(
      'Este ingreso no está autorizado para anulación.',
      403,
    )
  const fieldErrors = validateEntryAnnulment(payload)
  if (Object.keys(fieldErrors).length)
    throw new EntryAnnulmentApiError(
      'Revisa la confirmación y el motivo.',
      422,
      fieldErrors,
    )
  try {
    // No DELETE, optimistic update or automatic retry. Author/time come from
    // the server; the original attendance is never edited by this client.
    const response = await httpClient.post<{ data: AnnulmentHistoryRecord }>(
      `/exams/${examId}/entry-control/entries/${original.entry.id}/annulment`,
      { reason: payload.reason.trim() },
    )
    const result = response.data?.data
    const entry = result?.entry
    const annulment = entry?.annulment
    if (
      !entry ||
      entry.id !== original.entry.id ||
      entry.exam_id !== examId ||
      entry.student_id !== original.entry.student_id ||
      result.student?.student_id !== original.student.student_id ||
      entry.entered_at !== original.entry.entered_at ||
      entry.verified_by !== original.entry.verified_by ||
      entry.verified_by_name !== original.entry.verified_by_name ||
      entry.verification_method !== original.entry.verification_method ||
      entry.room_id !== original.entry.room_id ||
      entry.status !== 'ANNULLED' ||
      !annulment ||
      typeof annulment.reason !== 'string' ||
      !annulment.reason.trim() ||
      !timestamp(annulment.annulled_at) ||
      !positiveId(annulment.annulled_by?.id) ||
      typeof annulment.annulled_by.name !== 'string' ||
      !annulment.annulled_by.name.trim()
    )
      throw new EntryAnnulmentApiError(
        'La respuesta no confirma la anulación con su evidencia original. Actualiza el historial antes de repetir la operación.',
      )
    return result
  } catch (error) {
    return mapError(error)
  }
}
