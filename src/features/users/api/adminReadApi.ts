import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'

export interface Career { id: number; code: string; name: string; status: 'ACTIVE' | 'INACTIVE' }
export interface AuditEvent {
  id: number; actor_id: number | null; action: string; entity_type: string; entity_id: number | null;
  created_at: string | null; old_context: Record<string, unknown> | []; new_context: Record<string, unknown> | [];
}
export interface ReadMeta { current_page: number; last_page: number; total: number; from: number | null; to: number | null }
export interface ReadPage<T> { data: T[]; meta: ReadMeta }
export type ReadQuery = { page: number; search: string }

const positive = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0
function validRow(value: unknown, path: string): boolean {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<Career & AuditEvent>
  if (!positive(row.id)) return false
  if (path === 'careers') return typeof row.code === 'string' && typeof row.name === 'string' &&
    (row.status === 'ACTIVE' || row.status === 'INACTIVE')
  return (row.actor_id === null || positive(row.actor_id)) && typeof row.action === 'string' &&
    typeof row.entity_type === 'string' && (row.entity_id === null || positive(row.entity_id)) &&
    (row.created_at === null || (typeof row.created_at === 'string' && Number.isFinite(Date.parse(row.created_at)))) &&
    row.old_context !== null && typeof row.old_context === 'object' && row.new_context !== null && typeof row.new_context === 'object'
}

function errorMessage(cause: unknown): Error {
  const status = axios.isAxiosError(cause) ? cause.response?.status : undefined
  return new Error(status === 401 ? 'Tu sesión expiró. Inicia sesión nuevamente.' : status === 403
    ? 'No tienes permisos para consultar esta información.' : status === 404 ? 'El registro no existe.'
    : 'No se pudo cargar la información. Intenta nuevamente.')
}

async function list<T>(path: string, query: ReadQuery, signal: AbortSignal): Promise<ReadPage<T>> {
  try {
    const response = await httpClient.get<ReadPage<T>>(`/admin/${path}`, { signal,
      params: { page: query.page, per_page: 10, ...(path === 'careers' ? { search: query.search.trim() || undefined } : {}) } })
    const meta = response.data?.meta
    if (!Array.isArray(response.data?.data) || !response.data.data.every((row) => validRow(row, path)) || !meta ||
      !positive(meta.current_page) || !positive(meta.last_page) || !Number.isSafeInteger(meta.total) || meta.total < 0 ||
      !(meta.from === null || positive(meta.from)) || !(meta.to === null || positive(meta.to))) throw new Error('Invalid response')
    return response.data
  } catch (cause) { throw errorMessage(cause) }
}
async function detail<T>(path: string, id: number, signal: AbortSignal): Promise<T> {
  try {
    const response = await httpClient.get<{ data: T }>(`/admin/${path}/${id}`, { signal })
    if (!validRow(response.data?.data, path) || (response.data.data as { id: number }).id !== id) throw new Error('Invalid response')
    return response.data.data
  } catch (cause) { throw errorMessage(cause) }
}
export const listCareers = (query: ReadQuery, signal: AbortSignal) => list<Career>('careers', query, signal)
export const readCareer = (id: number, signal: AbortSignal) => detail<Career>('careers', id, signal)
export const listAuditEvents = (query: ReadQuery, signal: AbortSignal) => list<AuditEvent>('audit-logs', query, signal)
export const readAuditEvent = (id: number, signal: AbortSignal) => detail<AuditEvent>('audit-logs', id, signal)
