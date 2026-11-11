import type { PortalQuery } from '@/features/portal-shared/api/portalApi'

export type NewsStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
// Contract: backend 9172f18, docs/PORTAL_CATEGORIES_API.md. IDs are dynamic.
export type NewsCategory = { id: number; name: string }
export type NewsSummary = {
  id: number
  title: string
  summary: string
  image_url: string | null
  published_at: string | null
  // Historical news may have no category; an inactive one is still returned.
  category: NewsCategory | null
}
export type NewsDetail = NewsSummary & { content: string }
export type AdminNewsSummary = NewsSummary & {
  status: NewsStatus
  revision: number
  created_by: number
  updated_by: number
  published_by: number | null
  created_at?: string | null
  updated_at?: string | null
}
export type AdminNews = AdminNewsSummary & { content: string }
export type NewsInput = Pick<NewsDetail, 'title' | 'summary' | 'content'> & {
  category_id: number
}
// PATCH: omit category_id to keep the current association; null is never sent.
export type NewsEditInput = Partial<NewsInput>
export type NewsListQuery = PortalQuery & { category_id?: number }
export const NEWS_STATUS_LABELS: Record<NewsStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
}
