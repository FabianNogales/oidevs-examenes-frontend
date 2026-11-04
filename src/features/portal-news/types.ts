export type NewsStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type NewsSummary = {
  id: number
  title: string
  summary: string
  image_url: string | null
  published_at: string | null
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
export type NewsInput = Pick<NewsDetail, 'title' | 'summary' | 'content'>
export const NEWS_STATUS_LABELS: Record<NewsStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
}
