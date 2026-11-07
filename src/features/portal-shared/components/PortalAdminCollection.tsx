import { useCallback, useState, type ReactNode } from 'react'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import {
  portalPagination,
  type PortalPage,
  type PortalQuery,
} from '../api/portalApi'
import { usePortalResource } from '../hooks/usePortalResource'
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
  resetPageKey?: string
  children?: ReactNode
}) {
  const [query, setQuery] = useState({
    page: 1,
    search: '',
    version,
    resetPageKey,
  })
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
            Crear
          </button>
        ) : null}
      </header>
      {children}
      <div className={styles.collectionList}>
        <DataTable<PortalRow<T>>
          searchPlaceholder={searchPlaceholder}
          searchLayout={searchLayout}
          columns={columns}
          data={(list.data?.data ?? []).map((item) => ({ id: item.id, item }))}
          loading={list.loading}
          error={list.error?.message}
          pagination={list.data ? portalPagination(list.data) : null}
          viewActionLabel="Gestionar"
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
