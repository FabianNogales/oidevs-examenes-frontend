import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import { getCollaborationError } from '@/features/collaborations/api/collaborationsApi'
import {
  getApiErrorCode,
  getRequestStatus,
} from '@/features/auth/utils/apiErrors'
import {
  parseDistribution,
  parseOfflinePackage,
  parseSyncResults,
} from '../utils/offlineContract'
import type { SyncBatch } from '../types/offline.types'

const path = (examId: number) => `/exams/${examId}/offline`
export async function getOfflineAssignments(
  examId: number,
  signal?: AbortSignal,
) {
  const response = await httpClient.get<{ data: unknown }>(
    `${path(examId)}/assignments`,
    { signal, timeout: 15000 },
  )
  return parseDistribution(response.data.data, examId)
}
export async function prepareOfflineAssignments(
  examId: number,
  signal?: AbortSignal,
) {
  const response = await httpClient.post<{ data: unknown }>(
    `${path(examId)}/prepare`,
    {},
    { signal, timeout: 30000 },
  )
  return parseDistribution(response.data.data, examId)
}
export async function downloadOfflinePackage(
  examId: number,
  ownerId: number,
  signal?: AbortSignal,
) {
  const response = await httpClient.get<{ data: unknown }>(
    `${path(examId)}/package`,
    { signal, timeout: 30000 },
  )
  return parseOfflinePackage(response.data.data, examId, ownerId)
}
export async function sendOfflineBatch(
  examId: number,
  batch: SyncBatch,
  signal?: AbortSignal,
) {
  const response = await httpClient.post<{ data: unknown }>(
    `${path(examId)}/sync`,
    batch,
    { signal, timeout: 45000 },
  )
  return parseSyncResults(response.data.data, examId, batch)
}
export function offlineError(error: unknown): string {
  if (!axios.isAxiosError(error) && error instanceof Error) return error.message
  const status = getRequestStatus(error)
  const code = getApiErrorCode(error)
  if (code === 'DISTRIBUTION_FROZEN')
    return 'La distribución está congelada en versión 1. El servidor no permite regenerarla con datos modificados.'
  if (code === 'DISTRIBUTION_STALE')
    return 'La lista cambió o perdió su autorización. Los datos locales se conservaron, pero requieren revisión.'
  if (status === 419)
    return 'La sesión necesita renovarse. Reconéctate e inicia sesión; los eventos se conservaron.'
  if (status === 429)
    return 'Se alcanzó el límite de solicitudes. Espera un momento antes de reintentar.'
  if (status === 422)
    return getCollaborationError(
      error,
      'El lote no cumple el contrato del servidor. Los eventos se conservaron.',
    )
  return getCollaborationError(
    error,
    'No se pudo contactar al servidor. Los datos locales se conservaron; comprueba la conexión y reintenta.',
  )
}
