import { useMemo, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useControllableState } from '@/shared/hooks/useControllableState'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type {
  BaseTableEntity,
  DataTableProps,
  TableColumnDef,
  TablePaginationMeta,
} from '@/shared/components/DataTable/dataTable.types'
import { Spinner } from '../Spinner/Spinner'
import styles from './Table.module.css'

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  columnId: string
  direction: SortDirection
}

export interface TableColumn<T> {
  /** Unique column identifier. */
  id: string
  /** Visible semantic `<th>` header label. */
  header: string
  /** Cell renderer function. */
  render: (row: T) => ReactNode
  /** Optional sort value extractor. When `sortable` is true, enables sorting on this column. */
  sortValue?: (row: T) => string | number
  /** Marks the column sortable. */
  sortable?: boolean
  /** Horizontal alignment (`left`, `center`, `right`). */
  align?: 'left' | 'center' | 'right'
  /** Optional column width. */
  width?: string
}

export interface TableProps<T> {
  /** Column definitions. */
  columns: readonly TableColumn<T>[]
  /** Row data received via props (never fetched internally). */
  data: readonly T[]
  /** Unique key extractor for each row. */
  getRowKey: (row: T, index: number) => string | number
  /** Loading state flag. */
  loading?: boolean
  /** Loading message text. */
  loadingLabel?: string
  /** Empty state title when `data.length === 0`. */
  emptyTitle?: string
  /** Empty state description when `data.length === 0`. */
  emptyDescription?: string
  /** Controlled sort state. */
  sort?: SortState | null
  /** Initial sort state when uncontrolled. */
  defaultSort?: SortState | null
  /** Callback fired when sort column or direction changes. */
  onSortChange?: (nextSort: SortState | null) => void
  /** Optional caption for screen readers. */
  caption?: string
  className?: string
}

/**
 * Global Table organism: semantic `<table>` / `<thead>` / `<th scope="col">` / `<tbody>`
 * with built-in accessible sorting (`aria-sort`), loading state, and empty state via props.
 * Does not fetch data: receives `data` purely via props.
 */
export function Table<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  loadingLabel = 'Cargando registros…',
  emptyTitle = 'No se encontraron registros',
  emptyDescription = 'No hay datos disponibles para mostrar en este momento.',
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  caption,
  className,
}: TableProps<T>) {
  const [sortState, setSortState] = useControllableState<SortState | null>({
    value: sortProp,
    defaultValue: defaultSort,
    onChange: onSortChange,
  })

  const sortedData = useMemo(() => {
    if (!sortState) return [...data]
    const col = columns.find((item) => item.id === sortState.columnId)
    if (!col || !col.sortValue) return [...data]

    const copy = [...data]
    copy.sort((a, b) => {
      const valA = col.sortValue!(a)
      const valB = col.sortValue!(b)
      if (valA === valB) return 0
      const comparison = valA < valB ? -1 : 1
      return sortState.direction === 'asc' ? comparison : -comparison
    })
    return copy
  }, [columns, data, sortState])

  function handleHeaderSort(column: TableColumn<T>) {
    if (!column.sortable) return
    if (!sortState || sortState.columnId !== column.id) {
      setSortState({ columnId: column.id, direction: 'asc' })
    } else if (sortState.direction === 'asc') {
      setSortState({ columnId: column.id, direction: 'desc' })
    } else {
      setSortState(null)
    }
  }

  if (loading) {
    return (
      <div
        role="status"
        className={[styles.stateBox, className].filter(Boolean).join(' ')}
      >
        <Spinner size="md" />
        <p className={styles.stateText}>{loadingLabel}</p>
      </div>
    )
  }

  if (sortedData.length === 0) {
    return (
      <div className={[styles.stateBox, className].filter(Boolean).join(' ')}>
        <strong className={styles.emptyTitle}>{emptyTitle}</strong>
        <p className={styles.stateText}>{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className={[styles.tableWrap, className].filter(Boolean).join(' ')}>
      <table className={styles.table}>
        {caption ? <caption className={styles.caption}>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sortState?.columnId === column.id
              const ariaSort = column.sortable
                ? isSorted
                  ? sortState.direction === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
                : undefined

              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={ariaSort}
                  style={column.width ? { width: column.width } : undefined}
                  className={[
                    styles.th,
                    column.align ? styles[`align-${column.align}`] : styles['align-left'],
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      data-ds-button=""
                      className={styles.sortButton}
                      onClick={() => handleHeaderSort(column)}
                    >
                      <span>{column.header}</span>
                      {isSorted ? (
                        sortState.direction === 'asc' ? (
                          <ArrowUp size={14} aria-hidden="true" />
                        ) : (
                          <ArrowDown size={14} aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown size={14} aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr key={getRowKey(row, index)} className={styles.tr}>
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={[
                    styles.td,
                    column.align ? styles[`align-${column.align}`] : styles['align-left'],
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export {
  DataTable,
  type BaseTableEntity,
  type TableColumnDef,
  type TablePaginationMeta,
  type DataTableProps,
}
