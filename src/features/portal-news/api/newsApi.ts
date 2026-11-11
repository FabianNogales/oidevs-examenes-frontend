import { httpClient } from '@/shared/api/httpClient'
import type { PortalPage } from '@/features/portal-shared/api/portalApi'
import type {
  AdminNews,
  AdminNewsSummary,
  NewsCategory,
  NewsDetail,
  NewsEditInput,
  NewsInput,
  NewsListQuery,
  NewsStatus,
  NewsSummary,
} from '../types/news.types'

const isCategory = (category: unknown): category is NewsCategory =>
  !!category &&
  typeof category === 'object' &&
  Number.isSafeInteger((category as NewsCategory).id) &&
  (category as NewsCategory).id > 0 &&
  typeof (category as NewsCategory).name === 'string'

// Contract: backend 9172f18, docs/PORTAL_CATEGORIES_API.md. Selectors return
// only active categories, unpaginated, ordered by the backend.
export async function getNewsCategories(
  admin = false,
  signal?: AbortSignal,
): Promise<NewsCategory[]> {
  const { data } = await httpClient.get<{ data: unknown }>(
    `${admin ? '/admin' : ''}/portal/news-categories`,
    { signal },
  )
  if (!Array.isArray(data?.data) || !data.data.every(isCategory))
    throw new Error('Formato de categorías no válido.')
  return data.data
}

// The public resource omits status. Reject explicitly non-public or malformed
// records rather than rendering content from an unexpected administrative response.
function requirePublicNews(news: NewsSummary): void {
  if (
    !news ||
    !Number.isSafeInteger(news.id) ||
    news.id < 1 ||
    typeof news.title !== 'string' ||
    typeof news.summary !== 'string' ||
    (news.image_url !== null && typeof news.image_url !== 'string') ||
    typeof news.published_at !== 'string' ||
    Number.isNaN(Date.parse(news.published_at)) ||
    ('status' in news && news.status !== 'PUBLISHED') ||
    // null (historical news) is valid; a present category must be well formed.
    (news.category != null && !isCategory(news.category))
  ) {
    throw new Error('Respuesta de noticia pública no válida.')
  }
}

export async function listNews(
  query: NewsListQuery,
  signal?: AbortSignal,
): Promise<PortalPage<NewsSummary>> {
  const { data } = await httpClient.get('/portal/news', {
    params: query,
    signal,
  })
  const meta = data?.meta
  if (
    !Array.isArray(data?.data) ||
    !meta ||
    !Number.isSafeInteger(meta.current_page) ||
    meta.current_page < 1 ||
    !Number.isSafeInteger(meta.last_page) ||
    meta.last_page < 1 ||
    !Number.isSafeInteger(meta.per_page) ||
    meta.per_page < 1 ||
    !Number.isSafeInteger(meta.total) ||
    meta.total < 0
  ) {
    throw new Error('Respuesta de noticias públicas no válida.')
  }
  data.data.forEach(requirePublicNews)
  return data
}
export async function getNews(
  id: number,
  signal?: AbortSignal,
): Promise<NewsDetail> {
  const { data } = await httpClient.get(`/portal/news/${id}`, { signal })
  requirePublicNews(data?.data)
  if (typeof data.data.content !== 'string')
    throw new Error('Contenido de noticia pública no válido.')
  return data.data
}
export async function listAdminNews(
  query: NewsListQuery & { status?: NewsStatus },
  signal?: AbortSignal,
): Promise<PortalPage<AdminNewsSummary>> {
  const { data } = await httpClient.get('/admin/portal/news', {
    params: query,
    signal,
  })
  return data
}
export async function getAdminNews(
  id: number,
  signal?: AbortSignal,
): Promise<AdminNews> {
  const { data } = await httpClient.get(`/admin/portal/news/${id}`, { signal })
  return data.data
}
export async function createNews(input: NewsInput): Promise<AdminNews> {
  const { data } = await httpClient.post('/admin/portal/news', input)
  return data.data
}
export async function editNews(
  id: number,
  input: NewsEditInput,
  revision: number,
): Promise<AdminNews> {
  const { data } = await httpClient.patch(`/admin/portal/news/${id}`, {
    ...input,
    revision,
  })
  return data.data
}
export async function setNewsStatus(
  id: number,
  status: NewsStatus,
  revision: number,
): Promise<AdminNews> {
  const { data } = await httpClient.patch(`/admin/portal/news/${id}/status`, {
    status,
    revision,
  })
  return data.data
}
export async function uploadNewsImage(
  id: number,
  image: File,
  revision: number,
): Promise<AdminNews> {
  const form = new FormData()
  form.append('revision', String(revision))
  form.append('image', image)
  const { data } = await httpClient.post(`/admin/portal/news/${id}/image`, form)
  return data.data
}
export async function removeNewsImage(
  id: number,
  revision: number,
): Promise<AdminNews> {
  const { data } = await httpClient.delete(`/admin/portal/news/${id}/image`, {
    data: { revision },
  })
  return data.data
}
export async function getNewsImage(
  url: string,
  signal: AbortSignal,
): Promise<Blob> {
  const { data } = await httpClient.get<Blob>(url, {
    signal,
    responseType: 'blob',
  })
  return data
}
