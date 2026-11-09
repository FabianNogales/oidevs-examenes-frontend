import { useCallback, useState, type ReactNode } from 'react'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import {
  portalPagination,
  type PortalPage,
  type PortalQuery,
} from './portalApi'
import { usePortalResource } from './usePortalResource'
import styles from './portalShared.module.css'

export type PortalRow<T> = { id: number; item: T }

export function PortalAdminCollection<T extends { id: number }>({
  title,
  description,
  className,
  searchLayout,
  searchPlaceholder = 'Buscar contenido',
  load,
  columns,
  version,
  onSelect,
  onCreate,
  createDisabled = false,
  createLabel = 'Crear',
  viewActionLabel = 'Gestionar',
  filters,
  filterLayout,
  resetPageKey,
  children,
}: {
  title: string
  description?: string
  className?: string
  searchLayout?: 'standard' | 'wide'
  searchPlaceholder?: string
  load: (query: PortalQuery, signal: AbortSignal) => Promise<PortalPage<T>>
  columns: readonly TableColumnDef<PortalRow<T>>[]
  version: number
  onSelect: (id: number) => void
  onCreate?: () => void
  createDisabled?: boolean
  createLabel?: string
  viewActionLabel?: string
  /** Opt-in controls inside the table's search/filter surface. */
  filters?: ReactNode
  filterLayout?: 'below' | 'inline'
  resetPageKey?: string
  children?: ReactNode
}) {
  const [query, setQuery] = useState({
    page: 1,
    search: '',
    version,
    resetPageKey,
  })
  // Commit each filter/version change without remounting or dropping search.
  // Otherwise returning to an earlier filter could revive its stale page.
  if (query.version !== version || query.resetPageKey !== resetPageKey) {
    setQuery({ ...query, page: 1, version, resetPageKey })
  }
  const request = useCallback(
    (signal: AbortSignal) => {
      // A successful mutation refreshes the first page, retaining the active search.
      return load(
        {
          search: query.search,
          page:
            query.version === version && query.resetPageKey === resetPageKey
              ? query.page
              : 1,
          per_page: 15,
        },
        signal,
      )
    },
    [load, query, version, resetPageKey],
  )
  const list = usePortalResource(request)
  // Query identity without `version`: a save only bumps `version` (page 1, same
  // search, filter key and loader), so its refresh can keep the previous rows.
  const page =
    query.version === version && query.resetPageKey === resetPageKey
      ? query.page
      : 1
  const identity = JSON.stringify([query.search, page, resetPageKey ?? null])
  const [settled, setSettled] = useState<{
    identity: string
    load: typeof load
    data: PortalPage<T>
  } | null>(null)
  if (list.data && settled?.data !== list.data) {
    setSettled({ identity, load, data: list.data })
  }
  // Keeping the rows mounted preserves the button that opened a Drawer, so the
  // dialog can restore focus to it. Any other query change shows the loader.
  const refreshing =
    list.loading &&
    settled !== null &&
    settled.identity === identity &&
    settled.load === load
  const visible = refreshing ? settled.data : list.data
  return (
    <div className={`${styles.page}${className ? ` ${className}` : ''}`}>
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: title }]} />
      <header className={styles.toolbar}>
        {description ? (
          <div className={styles.collectionHeading}>
            <h1>{title}</h1>
            <p className={styles.collectionDescription}>{description}</p>
          </div>
        ) : (
          <h1>{title}</h1>
        )}
        {onCreate ? (
          <button
            type="button"
            className={styles.primary}
            disabled={createDisabled}
            onClick={onCreate}
          >
            {createLabel}
          </button>
        ) : null}
      </header>
      {children}
      <div className={styles.collectionList} aria-busy={refreshing}>
        <DataTable<PortalRow<T>>
          filters={filters}
          filterLayout={filterLayout}
          searchPlaceholder={searchPlaceholder}
          searchLayout={searchLayout}
          columns={columns}
          data={(visible?.data ?? []).map((item) => ({ id: item.id, item }))}
          loading={list.loading && !refreshing}
          error={list.error?.message}
          pagination={visible ? portalPagination(visible) : null}
          viewActionLabel={viewActionLabel}
          entityLabel="registros"
          onViewProfile={(row) => onSelect(row.id)}
          onSearch={(search) =>
            setQuery({
              page: 1,
              search: search.slice(0, 200),
              version,
              resetPageKey,
            })
          }
          onPageChange={(page) =>
            setQuery((current) => ({ ...current, page, version, resetPageKey }))
          }
          onRetry={list.reload}
          emptyTitle="No hay registros disponibles"
          emptyDescription="No se encontraron contenidos para esta consulta."
        />
      </div>
    </div>
  )
}
