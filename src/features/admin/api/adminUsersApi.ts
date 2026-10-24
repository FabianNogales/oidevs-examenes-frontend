import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'

export type AccountRole = { id: number; name: string; status?: 'ACTIVE' | 'INACTIVE' }
export type AdminUserItem = {
  id: number; first_names: string; last_names: string; full_name: string
  institutional_code: string | null; identity_number: string | null; email: string
  status: 'ACTIVE' | 'INACTIVE'; roles: AccountRole[]; role_label: string
  student_id: number | null; teacher_id: number | null
  student_status: string | null; teacher_status: string | null
}
export type UserRoleItem = AccountRole & { status: 'ACTIVE' | 'INACTIVE'; assigned: boolean }
export type AccountEvent = {
  id: number; user_id: number; actor_id: number | null; actor_name: string | null
  action: string; created_at: string | null; old_context: Record<string, unknown>; new_context: Record<string, unknown>
}
export type ReadMeta = { current_page: number; last_page: number; total: number; from: number | null; to: number | null }
export type ReadPage<T> = { data: T[]; meta: ReadMeta }
export const roleLabel = (name: string) => ({ ADMINISTRADOR: 'Administrador', DOCENTE: 'Docente', ESTUDIANTE: 'Estudiante', COLLABORATOR: 'Colaboración temporal' }[name] ?? name)
export const eventLabel = (name: string) => ({ USER_STATUS_CHANGED: 'Cambio de estado de cuenta', USER_ROLE_ASSIGNED: 'Asignación de rol', USER_ROLE_REVOKED: 'Retiro de rol', EXAM_COLLABORATOR_ASSIGNED: 'Designación temporal', EXAM_COLLABORATOR_REASSIGNED: 'Nueva designación temporal', EXAM_COLLABORATOR_REVOKED: 'Revocación temporal' }[name] ?? name)

export class AdminAccountError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) { super(message); this.name = 'AdminAccountError'; this.status = status }
}
export function accountError(cause: unknown): AdminAccountError {
  if (cause instanceof AdminAccountError) return cause
  if (!axios.isAxiosError(cause)) return new AdminAccountError('El servidor devolvió datos no válidos. Vuelve a consultar antes de reintentar una operación.')
  const status = cause.response?.status ?? null
  const message = status === 401 ? 'Tu sesión dejó de estar vigente. Inicia sesión nuevamente.'
    : status === 403 ? 'No tienes permisos administrativos para esta operación.'
      : status === 404 ? 'El registro solicitado no existe.'
        : status === 409 || status === 422 ? (typeof cause.response?.data?.message === 'string' ? cause.response.data.message : 'Revisa las condiciones de la operación.')
          : 'No se pudo completar la solicitud. Consulta el estado actual antes de reintentar.'
  return new AdminAccountError(message, status)
}
export const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
export const isId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0
const isNullableString = (value: unknown) => value === null || typeof value === 'string'
const validRole = (value: unknown): value is AccountRole => isObject(value) && isId(value.id) && typeof value.name === 'string'
const validUserRole = (value: unknown): value is UserRoleItem => {
  if (!isObject(value)) return false
  const record: Record<string, unknown> = value
  return validRole(value) && ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'].includes(value.name) &&
    typeof record.assigned === 'boolean' && ['ACTIVE', 'INACTIVE'].includes(String(record.status))
}
function user(value: unknown): AdminUserItem {
  if (!isObject(value) || !isId(value.id) || !['ACTIVE', 'INACTIVE'].includes(String(value.status)) ||
    !['email', 'first_names', 'last_names', 'full_name'].every((key) => typeof value[key] === 'string') ||
    !['institutional_code', 'identity_number', 'student_status', 'teacher_status'].every((key) => isNullableString(value[key])) ||
    !['student_id', 'teacher_id'].every((key) => value[key] === null || isId(value[key])) ||
    !Array.isArray(value.roles) || !value.roles.every(validRole)) throw new AdminAccountError('El servidor devolvió una cuenta no válida.')
  const roles = value.roles
  return { ...value, roles, role_label: roles.map((role) => roleLabel(role.name) + (role.status === 'INACTIVE' ? ' (rol inactivo)' : '')).join('\n') || 'Sin roles asignados' } as AdminUserItem
}
export function readMeta(value: unknown, count: number): ReadMeta {
  if (!isObject(value) || !isId(value.current_page) || !isId(value.last_page) ||
    !Number.isSafeInteger(value.total) || Number(value.total) < count ||
    !['from', 'to'].every((key) => value[key] === null || isId(value[key]))) throw new AdminAccountError('La paginación recibida no es válida.')
  return value as ReadMeta
}
// TODO(HU21-P01): restore the original CI/role-label search in the paginated
// server contract; do not search only the returned page. See the preservation doc.
export async function getAdminUsers({ page = 1, perPage = 10, search = '' } = {}, signal?: AbortSignal) {
  try {
    const { data } = await httpClient.get('/admin/users', { params: { page, per_page: perPage, search }, signal })
    if (!Array.isArray(data?.data)) throw new AdminAccountError('El listado recibido no es válido.')
    const users = data.data.map(user)
    return { users, meta: readMeta(data.meta, users.length) }
  } catch (cause) { throw accountError(cause) }
}
export async function getAdminUser(id: number, signal?: AbortSignal) {
  try {
    const { data } = await httpClient.get(`/admin/users/${id}`, { signal })
    const result = user(data?.data)
    if (result.id !== id) throw new AdminAccountError('La cuenta recibida no corresponde a la solicitada.')
    return result
  } catch (cause) { throw accountError(cause) }
}
export async function updateAdminUserStatus(id: number, status: AdminUserItem['status']) {
  try {
    const { data } = await httpClient.patch(`/admin/users/${id}/status`, { status })
    const result = user(data?.data)
    if (result.id !== id || result.status !== status) throw new AdminAccountError('No se pudo verificar el cambio de estado. Consulta la cuenta.')
    return result
  } catch (cause) { throw accountError(cause) }
}
export async function getUserRoles(id: number, signal?: AbortSignal): Promise<UserRoleItem[]> {
  try {
    const { data } = await httpClient.get(`/admin/users/${id}/roles`, { signal })
    if (!Array.isArray(data?.data) || !data.data.every(validUserRole)) throw new AdminAccountError('El catálogo de roles no es válido.')
    return data.data
  } catch (cause) { throw accountError(cause) }
}
export async function changeUserRole(id: number, role: UserRoleItem) {
  try {
    const response = role.assigned ? await httpClient.delete(`/admin/users/${id}/roles/${role.id}`)
      : await httpClient.post(`/admin/users/${id}/roles`, { role_id: role.id })
    const result = user(response.data?.data)
    if (result.id !== id || result.roles.some((item) => item.id === role.id) === role.assigned) throw new AdminAccountError('Consulta los roles actuales antes de reintentar.')
    return result
  } catch (cause) { throw accountError(cause) }
}
export async function getAccountHistory(page = 1, search = '', signal?: AbortSignal): Promise<ReadPage<AccountEvent>> {
  try {
    const { data } = await httpClient.get('/admin/users/history', { params: { page, per_page: 10, search }, signal })
    if (!Array.isArray(data?.data) || !data.data.every((item: unknown) => isObject(item) && isId(item.id) && isId(item.user_id) &&
      typeof item.action === 'string' && isNullableString(item.actor_name) && isNullableString(item.created_at) &&
      (item.actor_id === null || isId(item.actor_id)) && (isObject(item.old_context) || Array.isArray(item.old_context)) &&
      (isObject(item.new_context) || Array.isArray(item.new_context)))) throw new AdminAccountError('El historial recibido no es válido.')
    return { data: data.data, meta: readMeta(data.meta, data.data.length) }
  } catch (cause) { throw accountError(cause) }
}
