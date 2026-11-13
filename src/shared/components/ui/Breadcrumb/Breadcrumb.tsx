import {
  Breadcrumbs,
  type BreadcrumbItem,
} from '@/shared/components/Breadcrumbs/Breadcrumbs'

export { Breadcrumbs, type BreadcrumbItem }
export const Breadcrumb = Breadcrumbs
export type BreadcrumbProps = { items: readonly BreadcrumbItem[] }
