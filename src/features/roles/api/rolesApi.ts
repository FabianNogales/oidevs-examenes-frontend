import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'

export type RolePermission = {
  key: string
  module: string
  label: string
  description: string
  is_configurable: boolean
  is_enabled: boolean
}
export type ManagedRole = {
  id: number
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  is_custom: boolean
  is_protected: boolean
  revision: number
  permission_keys: string[]
}
export type RoleDraft = { name: string; permission_keys: string[] }

export class ManagementError extends Error {
  readonly fields: Record<string, string>
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ManagementError'
    this.fields = fields
  }
}

export function managementError(cause: unknown): ManagementError {
  if (cause instanceof ManagementError) return cause
  if (axios.isAxiosError(cause)) {
    const status = cause.response?.status
    const data = cause.response?.data
    const fields: Record<string, string> = {}
    if (data?.errors && typeof data.errors === 'object') {
      for (const [key, messages] of Object.entries(data.errors)) {
        if (Array.isArray(messages) && typeof messages[0] === 'string') fields[key.split('.')[0]] = messages[0]
      }
    }
    return new ManagementError(
      status === 401 ? 'Tu sesión dejó de estar vigente. Inicia sesión nuevamente.'
        : status === 403 ? 'Solo un administrador puede realizar esta operación.'
          : status === 409 ? 'El registro cambió. Cierra el formulario y vuelve a consultarlo antes de guardar.'
            : status === 422 ? (Object.values(fields)[0] ?? (typeof data?.message === 'string' ? data.message : 'Revisa los datos del formulario.'))
              : 'No se pudo completar la operación. Consulta el estado actual antes de reintentar.', fields,
    )
  }
  return new ManagementError('La respuesta del servidor no es válida. Vuelve a consultar.')
}

function readRole(value: ManagedRole): ManagedRole {
  if (!value || !Number.isSafeInteger(value.id) || value.id < 1 || typeof value.name !== 'string' ||
    !['ACTIVE', 'INACTIVE'].includes(value.status) || typeof value.is_custom !== 'boolean' ||
    value.is_protected !== !value.is_custom || !Number.isSafeInteger(value.revision) || value.revision < 1 ||
    !Array.isArray(value.permission_keys) || !value.permission_keys.every((key) => typeof key === 'string') ||
    new Set(value.permission_keys).size !== value.permission_keys.length) {
    throw new ManagementError('El servidor devolvió un rol no válido.')
  }
  return value
}

export async function getRoles(signal?: AbortSignal): Promise<ManagedRole[]> {
  try {
    const { data } = await httpClient.get('/admin/roles', { signal })
    if (!Array.isArray(data?.data)) throw new ManagementError('El catálogo de roles no es válido.')
    return data.data.map(readRole)
  } catch (cause) { throw managementError(cause) }
}

export async function getRole(id: number, signal?: AbortSignal): Promise<ManagedRole> {
  try {
    const { data } = await httpClient.get(`/admin/roles/${id}`, { signal })
    const role = readRole(data?.data)
    if (role.id !== id) throw new ManagementError('El rol no corresponde al solicitado.')
    return role
  } catch (cause) { throw managementError(cause) }
}

export async function getPermissions(signal?: AbortSignal): Promise<RolePermission[]> {
  try {
    const { data } = await httpClient.get('/admin/permissions', { signal })
    if (!Array.isArray(data?.data) || !data.data.every((p: RolePermission) => p &&
      ['key', 'module', 'label', 'description'].every((key) => typeof p[key as keyof RolePermission] === 'string') &&
      typeof p.is_configurable === 'boolean' && typeof p.is_enabled === 'boolean')) {
      throw new ManagementError('El catálogo de permisos no es válido.')
    }
    return data.data
  } catch (cause) { throw managementError(cause) }
}

export async function saveRole(draft: RoleDraft, original: ManagedRole | null): Promise<ManagedRole> {
  try {
    const { data } = original
      ? await httpClient.patch(`/admin/roles/${original.id}`, { ...draft, revision: original.revision })
      : await httpClient.post('/admin/roles', draft)
    const role = readRole(data?.data)
    if (original && role.id !== original.id) throw new ManagementError('El rol guardado no corresponde al solicitado.')
    return role
  } catch (cause) { throw managementError(cause) }
}
