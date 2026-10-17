import type { ReactNode } from 'react'

export type EntityStatus = 'ACTIVE' | 'INACTIVE'

export interface BaseTableEntity {
  id: number | string
  status?: EntityStatus
}

export interface TableColumnDef<T extends BaseTableEntity> {
  id: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  accessorKey?: keyof T
  cell?: (item: T) => ReactNode
}

export interface TablePaginationMeta {
  currentPage: number
  lastPage: number
  total: number
  from?: number | null
  to?: number | null
}

export interface DataTableRowProps<T extends BaseTableEntity> {
  item: T
  columns: readonly TableColumnDef<T>[]
  profilePath?: string
  onViewProfile?: (item: T) => void
  onToggleStatus?: (item: T) => void
}

export interface DataTableProps<T extends BaseTableEntity> {
  columns: readonly TableColumnDef<T>[]
  data: readonly T[]
  loading: boolean
  error?: string | null
  pagination?: TablePaginationMeta | null
  entityLabel?: string
  searchPlaceholder?: string
  initialSearch?: string
  onSearch?: (query: string) => void
  onPageChange?: (newPage: number) => void
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  getProfilePath?: (item: T) => string
  onViewProfile?: (item: T) => void
  onToggleStatus?: (item: T) => void
}