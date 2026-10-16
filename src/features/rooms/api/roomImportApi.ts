import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type {
  RoomImportConfirmation,
  RoomImportPreview,
  RoomImportReport,
} from '../types/roomImport.types'
import { ROOM_CSV_COLUMNS } from '../utils/roomCsv'

export class RoomImportError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'RoomImportError'
    this.status = status
  }
}

function isReport(value: RoomImportReport): boolean {
  if (
    !value ||
    !Array.isArray(value.rows) ||
    !Array.isArray(value.errors) ||
    !value.errors.every((error) => typeof error === 'string')
  )
    return false
  const counts = [value.total_rows, value.valid_rows, value.error_rows]
  if (
    !counts.every((count) => Number.isSafeInteger(count) && count >= 0) ||
    value.total_rows !== value.rows.length ||
    value.valid_rows + value.error_rows !== value.total_rows
  )
    return false
  const uniqueRows = new Set<number>()
  for (const row of value.rows) {
    if (
      !row ||
      !Number.isSafeInteger(row.row) ||
      row.row < 2 ||
      uniqueRows.has(row.row) ||
      typeof row.valid !== 'boolean' ||
      !Array.isArray(row.errors) ||
      !row.errors.every((error) => typeof error === 'string') ||
      (row.valid && row.errors.length > 0) ||
      (!row.valid && row.errors.length === 0) ||
      !row.data ||
      ROOM_CSV_COLUMNS.some(
        (column) => typeof row.data[column.key] !== 'string',
      )
    )
      return false
    uniqueRows.add(row.row)
  }
  return value.rows.filter((row) => row.valid).length === value.valid_rows
}

function mapError(error: unknown): RoomImportError {
  if (error instanceof RoomImportError) return error
  if (!axios.isAxiosError(error))
    return new RoomImportError(
      'El servidor devolvió un reporte inválido. Vuelve a validar el archivo.',
    )
  const status = error.response?.status ?? null
  let message = 'No se pudo procesar el archivo. Inténtalo nuevamente.'
  if (status === null)
    message =
      'No se pudo conectar con el servidor. Puedes reintentar la operación.'
  else if (status === 403) message = 'No tienes permisos para importar aulas.'
  else if (status === 404 || status === 501)
    message = 'La importación de aulas aún no está disponible en el servidor.'
  else if (status === 409 || status === 410)
    message =
      'La vista previa ya no está disponible. Vuelve a validar el archivo.'
  else if (status === 413)
    message = 'El archivo supera el tamaño permitido por el servidor.'
  else if (status === 422)
    message =
      'El archivo no cumple el formato esperado. Revisa la plantilla CSV.'
  if (status === 422 && typeof error.response?.data?.message === 'string')
    message = error.response.data.message
  return new RoomImportError(message, status)
}

function formData(file: File, previewId?: string) {
  const data = new FormData()
  data.append('file', file)
  if (previewId) data.append('preview_id', previewId)
  return data
}

export async function previewRoomImport(
  file: File,
  signal: AbortSignal,
): Promise<RoomImportPreview> {
  try {
    const response = await httpClient.post<{ data: RoomImportPreview }>(
      '/admin/rooms/import/preview',
      formData(file),
      { signal },
    )
    const preview = response.data?.data
    if (
      !isReport(preview) ||
      typeof preview.preview_id !== 'string' ||
      !preview.preview_id.trim() ||
      typeof preview.expires_at !== 'string' ||
      !Number.isFinite(Date.parse(preview.expires_at))
    )
      throw new RoomImportError(
        'El servidor devolvió una vista previa inválida. Vuelve a validar el archivo.',
      )
    return preview
  } catch (error) {
    throw mapError(error)
  }
}

export async function confirmRoomImport(
  file: File,
  previewId: string,
  signal: AbortSignal,
): Promise<RoomImportConfirmation> {
  try {
    const response = await httpClient.post<{ data: RoomImportConfirmation }>(
      '/admin/rooms/import/confirm',
      formData(file, previewId),
      { signal },
    )
    const result = response.data?.data
    if (
      !isReport(result) ||
      !Number.isSafeInteger(result.imported_rows) ||
      !Number.isSafeInteger(result.failed_rows) ||
      result.imported_rows !== result.valid_rows ||
      result.failed_rows !== result.error_rows
    )
      throw new RoomImportError(
        'No se pudo verificar el resultado de la importación. Reintenta con la misma vista previa para consultar su resultado.',
      )
    return result
  } catch (error) {
    throw mapError(error)
  }
}
