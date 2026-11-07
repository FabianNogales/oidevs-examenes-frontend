import { httpClient } from '@/shared/api/httpClient'
import type {
  PortalPage,
  PortalQuery,
} from '@/features/portal-shared/api/portalApi'
import type {
  AdminInformation,
  FaqDraft,
  InformationDraft,
  InformationKind,
  PublicInformation,
} from '../types/information.types'

export async function getInformation(
  signal?: AbortSignal,
): Promise<PublicInformation> {
  const { data } = await httpClient.get('/portal/information', { signal })
  return data.data
}
export async function listInformation(
  kind: InformationKind,
  query: PortalQuery & { is_published?: 0 | 1 },
  signal?: AbortSignal,
): Promise<PortalPage<AdminInformation>> {
  const { data } = await httpClient.get(`/admin/portal/information/${kind}`, {
    params: query,
    signal,
  })
  return data
}
export async function getInformationContent(
  kind: InformationKind,
  id: number,
  signal?: AbortSignal,
): Promise<AdminInformation> {
  const { data } = await httpClient.get(
    `/admin/portal/information/${kind}/${id}`,
    { signal },
  )
  return data.data
}
export async function createFaq(input: FaqDraft): Promise<AdminInformation> {
  const { data } = await httpClient.post(
    '/admin/portal/information/faqs',
    input,
  )
  return data.data
}
export async function saveInformation(
  kind: InformationKind,
  id: number,
  input: InformationDraft,
  revision: number,
): Promise<AdminInformation> {
  const { data } = await httpClient.patch(
    `/admin/portal/information/${kind}/${id}`,
    { ...input, revision },
  )
  return data.data
}
export async function publishInformation(
  kind: InformationKind,
  id: number,
  publish: boolean,
  revision: number,
): Promise<AdminInformation> {
  const { data } = await httpClient.post(
    `/admin/portal/information/${kind}/${id}/${publish ? 'publish' : 'unpublish'}`,
    { revision },
  )
  return data.data
}
