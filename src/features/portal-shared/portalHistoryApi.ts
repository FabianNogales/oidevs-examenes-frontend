import { httpClient } from '@/shared/api/httpClient'
import type { PortalPage } from './portalApi'

export type PortalHistoryResource =
  'events' | 'news' | 'information/sections' | 'information/faqs' | 'services'

export type HistoryValue =
  | string
  | number
  | boolean
  | null
  | HistoryValue[]
  | { [key: string]: HistoryValue }

export type PortalHistoryEntry = {
  id: number
  entity_type: string
  entity_id: number
  action: string
  actor_id: number | null
  actor_name: string | null
  created_at: string | null
  old_values: Record<string, HistoryValue> | null
  new_values: Record<string, HistoryValue> | null
}

export type PortalHistoryPage = PortalPage<PortalHistoryEntry> & {
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
}

export async function getPortalHistory(
  resource: PortalHistoryResource,
  id: number,
  page: number,
  signal: AbortSignal,
): Promise<PortalHistoryPage> {
  const { data } = await httpClient.get(
    `/admin/portal/${resource}/${id}/history`,
    { params: { page, per_page: 15 }, signal },
  )
  return data
}
