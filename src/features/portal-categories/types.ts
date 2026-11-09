// Contract: backend Dev_Hector 9172f18, docs/PORTAL_CATEGORIES_API.md.
// Two independent catalogs share one contract; their data never mixes.
export type CategoryCatalog = 'event' | 'news'

export type ManagedCategory = {
  id: number
  name: string
  is_active: boolean
  revision: number
}

export type CategoryStateFilter = '' | 'active' | 'inactive'

// Backend 9172f18 PortalCategoryController::history. Verified actions:
// PORTAL_CATEGORY_CREATED, PORTAL_CATEGORY_UPDATED, PORTAL_CATEGORY_STATUS_CHANGED.
// old_values/new_values are the {id, name, is_active, revision} snapshot
// (old_values is null on creation).
export type CategoryHistoryEntry = {
  id: number
  entity_type: string
  entity_id: number
  action: string
  actor_id: number | null
  actor_name: string | null
  created_at: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
}

export type CategoryListQuery = {
  page: number
  per_page?: number
  search?: string
  is_active?: boolean
}

export const CATEGORY_NAME_MAX = 100

export const CATEGORY_CATALOGS: Record<
  CategoryCatalog,
  {
    title: string
    description: string
    backTo: string
    backLabel: string
    deactivateMessage: string
  }
> = {
  event: {
    title: 'Categorías del calendario',
    description: 'Categorías disponibles para clasificar los eventos del calendario.',
    backTo: '/admin/portal/events',
    backLabel: 'Volver a gestión del calendario',
    deactivateMessage:
      'La categoría dejará de ofrecerse para nuevos eventos. Los eventos que ya la usan la conservan.',
  },
  news: {
    title: 'Categorías de noticias',
    description: 'Categorías disponibles para clasificar las noticias del portal.',
    backTo: '/admin/portal/news',
    backLabel: 'Volver a gestión de noticias',
    deactivateMessage:
      'La categoría dejará de ofrecerse para nuevas noticias. Las noticias que ya la usan la conservan.',
  },
}
