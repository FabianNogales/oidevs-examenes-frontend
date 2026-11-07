import { httpClient } from '@/shared/api/httpClient'
import type {
  PortalPage,
  PortalQuery,
} from '@/features/portal-shared/api/portalApi'
import type {
  AdminService,
  PortalService,
  ServiceInput,
  ServiceStatus,
} from '../types/services.types'

export async function listServices(
  query: Omit<PortalQuery, 'search'>,
  signal?: AbortSignal,
): Promise<PortalPage<PortalService>> {
  const { data } = await httpClient.get('/portal/services', {
    params: query,
    signal,
  })
  return data
}

export async function getService(
  id: number,
  signal?: AbortSignal,
): Promise<PortalService> {
  const { data } = await httpClient.get(`/portal/services/${id}`, { signal })
  return data.data
}

export async function listAdminServices(
  query: PortalQuery & { status: string },
  signal?: AbortSignal,
): Promise<PortalPage<AdminService>> {
  const { data } = await httpClient.get('/admin/portal/services', {
    params: { ...query, search: query.search ?? '', status: query.status ?? '' },
    signal,
  })
  return data
}

export async function getAdminService(
  id: number,
  signal?: AbortSignal,
): Promise<AdminService> {
  const { data } = await httpClient.get(`/admin/portal/services/${id}`, {
    signal,
  })
  return data.data
}

export async function createService(
  input: ServiceInput,
): Promise<AdminService> {
  const { data } = await httpClient.post('/admin/portal/services', input)
  return data.data
}

export async function editService(
  id: number,
  input: Partial<ServiceInput>,
  revision: number,
): Promise<AdminService> {
  const { data } = await httpClient.patch(`/admin/portal/services/${id}`, {
    ...input,
    revision,
  })
  return data.data
}

export async function setServiceStatus(
  id: number,
  status: ServiceStatus,
  revision: number,
): Promise<AdminService> {
  const { data } = await httpClient.patch(
    `/admin/portal/services/${id}/status`,
    { status, revision },
  )
  return data.data
}
