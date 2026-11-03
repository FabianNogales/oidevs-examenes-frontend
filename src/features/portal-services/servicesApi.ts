import { httpClient } from '@/shared/api/httpClient'
import type {
  PortalPage,
  PortalQuery,
} from '@/features/portal-shared/portalApi'
import type {
  AdminService,
  PortalService,
  ServiceCategory,
  ServiceInput,
  ServiceOptions,
  ServiceStatus,
} from './types'

export async function serviceCategories(
  admin = false,
  signal?: AbortSignal,
): Promise<ServiceCategory[]> {
  const { data } = await httpClient.get(
    `${admin ? '/admin' : ''}/portal/service-categories`,
    { signal },
  )
  return data.data
}
export async function serviceOptions(
  signal?: AbortSignal,
): Promise<ServiceOptions> {
  const { data } = await httpClient.get('/admin/portal/service-options', {
    signal,
  })
  return data.data
}
export async function listServices(
  query: PortalQuery & { category_id?: number },
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
  query: PortalQuery & { category_id?: number; status?: ServiceStatus },
  signal?: AbortSignal,
): Promise<PortalPage<AdminService>> {
  const { data } = await httpClient.get('/admin/portal/services', {
    params: query,
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
