import { httpClient } from '@/shared/api/httpClient'
import type { PortalPage } from '@/features/portal-shared/api/portalApi'
import type {
  CategoryCatalog,
  CategoryHistoryEntry,
  CategoryListQuery,
  ManagedCategory,
} from './types'

// Contract: backend Dev_Hector 9172f18, docs/PORTAL_CATEGORIES_API.md.
const manage = (catalog: CategoryCatalog) =>
  `/admin/portal/${catalog}-categories/manage`

const isManagedCategory = (value: unknown): value is ManagedCategory => {
  const item = value as ManagedCategory
  return (
    !!item &&
    typeof item === 'object' &&
    Number.isSafeInteger(item.id) &&
    item.id > 0 &&
    typeof item.name === 'string' &&
    typeof item.is_active === 'boolean' &&
    Number.isSafeInteger(item.revision) &&
    item.revision >= 0
  )
}

function requireCategory(value: unknown): ManagedCategory {
  if (!isManagedCategory(value))
    throw new Error('Respuesta de categoría no válida.')
  return value
}

const isValues = (value: unknown) =>
  value === null ||
  (!!value && typeof value === 'object' && !Array.isArray(value))

// Backend 9172f18 PortalCategoryController::history: audit rows ordered by
// newest first; old_values is null on creation.
const isHistoryEntry = (value: unknown): value is CategoryHistoryEntry => {
  const entry = value as CategoryHistoryEntry
  return (
    !!entry &&
    typeof entry === 'object' &&
    Number.isSafeInteger(entry.id) &&
    typeof entry.action === 'string' &&
    (entry.actor_name === null || typeof entry.actor_name === 'string') &&
    (entry.created_at === null || typeof entry.created_at === 'string') &&
    isValues(entry.old_values) &&
    isValues(entry.new_values)
  )
}

function requirePage<T>(
  data: { data?: unknown; meta?: PortalPage<T>['meta'] } | null | undefined,
  isItem: (value: unknown) => value is T,
  message: string,
): PortalPage<T> {
  const meta = data?.meta
  if (
    !Array.isArray(data?.data) ||
    !data.data.every(isItem) ||
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
    throw new Error(message)
  }
  return data as PortalPage<T>
}

export async function getCategoryHistory(
  catalog: CategoryCatalog,
  id: number,
  page: number,
  signal?: AbortSignal,
): Promise<PortalPage<CategoryHistoryEntry>> {
  const { data } = await httpClient.get(`${manage(catalog)}/${id}/history`, {
    params: { page, per_page: 10 },
    signal,
  })
  return requirePage(data, isHistoryEntry, 'Respuesta de historial no válida.')
}

export async function listManagedCategories(
  catalog: CategoryCatalog,
  query: CategoryListQuery,
  signal?: AbortSignal,
): Promise<PortalPage<ManagedCategory>> {
  const { data } = await httpClient.get(manage(catalog), {
    params: query,
    signal,
  })
  return requirePage(data, isManagedCategory, 'Respuesta de categorías no válida.')
}

// The contract has no GET /{id}: after a 409 the current resource is located
// in the management listing (both states, maximum page size).
export async function findManagedCategory(
  catalog: CategoryCatalog,
  id: number,
  signal?: AbortSignal,
): Promise<ManagedCategory> {
  for (let page = 1; ; page += 1) {
    const result = await listManagedCategories(
      catalog,
      { page, per_page: 100 },
      signal,
    )
    const found = result.data.find((category) => category.id === id)
    if (found) return found
    if (page >= result.meta.last_page)
      throw new Error('La categoría ya no está disponible.')
  }
}

export async function createCategory(
  catalog: CategoryCatalog,
  name: string,
): Promise<ManagedCategory> {
  const { data } = await httpClient.post(manage(catalog), { name })
  return requireCategory(data?.data)
}

export async function renameCategory(
  catalog: CategoryCatalog,
  id: number,
  name: string,
  revision: number,
): Promise<ManagedCategory> {
  const { data } = await httpClient.patch(`${manage(catalog)}/${id}`, {
    name,
    revision,
  })
  return requireCategory(data?.data)
}

export async function setCategoryStatus(
  catalog: CategoryCatalog,
  id: number,
  isActive: boolean,
  revision: number,
): Promise<ManagedCategory> {
  const { data } = await httpClient.patch(`${manage(catalog)}/${id}/status`, {
    is_active: isActive,
    revision,
  })
  return requireCategory(data?.data)
}
