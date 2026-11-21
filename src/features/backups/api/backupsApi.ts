import axios from 'axios'
import { backendHttpClient, httpClient } from '@/shared/api/httpClient'

export const backupStates = [
  'QUEUED',
  'RUNNING',
  'UPLOADING',
  'AVAILABLE',
  'FAILED',
] as const
export type BackupState = (typeof backupStates)[number]

export interface Backup {
  id: string
  requester: string
  type: 'MANUAL_FULL'
  state: BackupState
  filename: string
  bytes: number | null
  sha256: string | null
  postgres_version: string | null
  requested_at: string
  started_at: string | null
  completed_at: string | null
  verified_at: string | null
  error_code: string | null
}

export interface BackupPage {
  data: Backup[]
  meta: {
    current_page: number
    last_page: number
    total: number
    from: number | null
    to: number | null
  }
  summary: {
    total: number
    recorded_bytes: number
    last_available_at: string | null
    active: boolean
    enabled: boolean
  }
}

export function backupError(cause: unknown): string {
  if (cause instanceof Error && cause.message === 'DOWNLOAD_WINDOW_BLOCKED')
    return 'Permite abrir la ventana de descarga para este sitio e intenta nuevamente.'
  if (cause instanceof Error && cause.message === 'DOWNLOAD_TICKET_EXPIRED')
    return 'La autorización de descarga caducó. Pulsa Descargar para solicitar una nueva.'
  const status = axios.isAxiosError(cause) ? cause.response?.status : null
  switch (status) {
    case 401:
      return 'Tu sesión ha expirado. Inicia sesión nuevamente.'
    case 403:
      return 'Tu cuenta no tiene acceso a los respaldos.'
    case 409:
      return 'Hay un respaldo en curso o el archivo aún no está disponible. Actualiza el historial.'
    case 419:
      return 'La sesión de seguridad expiró. Recarga la página.'
    case 422:
      return 'La solicitud no es válida. Actualiza la página e intenta nuevamente.'
    case 429:
      return 'Se alcanzó el límite de solicitudes. Espera antes de volver a intentar.'
    case 500:
      return 'No se pudo completar la operación. Consulta el historial antes de volver a solicitarla.'
    case 503:
      return 'El servicio de respaldos no está disponible. Consulta el historial e intenta más tarde.'
    default:
      return 'No se pudo confirmar la operación. Verifica tu conexión y consulta el historial.'
  }
}

export function isBackup(value: unknown): value is Backup {
  if (!value || typeof value !== 'object') return false
  const row = value as Backup
  return (
    typeof row.id === 'string' &&
    /^[0-9a-f-]{36}$/.test(row.id) &&
    backupStates.includes(row.state) &&
    row.type === 'MANUAL_FULL' &&
    typeof row.requester === 'string' &&
    typeof row.filename === 'string' &&
    Number.isFinite(Date.parse(row.requested_at)) &&
    (row.bytes === null ||
      (Number.isSafeInteger(row.bytes) && row.bytes >= 0)) &&
    (row.sha256 === null || /^[a-f0-9]{64}$/.test(row.sha256))
  )
}

export async function listBackups(
  page: number,
  signal: AbortSignal,
): Promise<BackupPage> {
  const response = await httpClient.get<BackupPage>('/admin/backups', {
    params: { page, per_page: 10 },
    signal,
  })
  const result = response.data
  if (
    !Array.isArray(result?.data) ||
    !result.data.every(isBackup) ||
    !Number.isInteger(result.meta?.current_page) ||
    result.meta.current_page < 1 ||
    !Number.isInteger(result.meta?.last_page) ||
    result.meta.last_page < 1 ||
    !Number.isSafeInteger(result.meta?.total) ||
    result.meta.total < 0 ||
    !result.summary ||
    typeof result.summary.enabled !== 'boolean' ||
    typeof result.summary.active !== 'boolean' ||
    !Number.isSafeInteger(result.summary.total) ||
    result.summary.total < 0 ||
    !Number.isSafeInteger(result.summary.recorded_bytes) ||
    result.summary.recorded_bytes < 0
  ) {
    throw new Error('Invalid backup response')
  }
  return result
}

export async function requestBackup(): Promise<Backup> {
  await backendHttpClient.get('/sanctum/csrf-cookie')
  const response = await httpClient.post<{ data: Backup }>('/admin/backups', {
    type: 'MANUAL_FULL',
  })
  if (response.status !== 202 || !isBackup(response.data?.data))
    throw new Error('Invalid backup response')
  return response.data.data
}

export interface DownloadTicket {
  method: 'POST'
  url: string
  ticket: string
  expires_at: string
  filename: string
}

export async function downloadBackup(id: string): Promise<DownloadTicket> {
  await backendHttpClient.get('/sanctum/csrf-cookie')
  const response = await httpClient.post<{ data: DownloadTicket }>(
    `/admin/backups/${encodeURIComponent(id)}/download-ticket`,
    {},
  )
  const data = response.data?.data
  const url = new URL(data.url)
  if (
    data.method !== 'POST' ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/download' ||
    url.search ||
    url.hash ||
    typeof data.ticket !== 'string' ||
    data.ticket.length > 4096 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.ticket) ||
    !Number.isFinite(Date.parse(data.expires_at))
  )
    throw new Error('Invalid download response')
  return { ...data, url: url.href }
}
