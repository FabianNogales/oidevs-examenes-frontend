import { useState, useMemo, type FormEvent } from 'react'
import { SearchIcon } from '@/assets/icons/SearchIcon'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import type { DataCardGridProps } from './dataCardGrid.types'
import { DataCardItem } from './DataCardItem'
import { useRouteAccessContext } from './useRouteAccessContext'
import styles from './DataCardGrid.module.css'

export function DataCardGrid<T extends BaseTableEntity>({
  fields,
  data,
  loading,
  error = null,
  pagination = null,
  pageSize = 10,
  labelWidth = '96px',
  entityLabel = 'registros',
  searchPlaceholder = 'Buscar registros...',
  initialSearch = '',
  onSearch,
  onPageChange,
  onRetry,
  emptyTitle = 'No se encontraron registros',
  emptyDescription = 'Intenta con otros términos de búsqueda o verifica que existan datos registrados.',
  actions,
  renderCustomActions,
  forcedModuleScope,
}: DataCardGridProps<T>) {
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [activeSearch, setActiveSearch] = useState(initialSearch)
  const [internalPage, setInternalPage] = useState(1)

  const routeContext = useRouteAccessContext(forcedModuleScope)

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchInput.trim()
    setActiveSearch(trimmed)
    setInternalPage(1)
    onSearch?.(trimmed)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setActiveSearch('')
    setInternalPage(1)
    onSearch?.('')
  }

  // Si el padre no pasa `pagination` del backend, calculamos paginación local 2x5 (10 por página)
  const effectivePagination = useMemo(() => {
    if (pagination) return pagination
    const total = data.length
    const lastPage = Math.max(1, Math.ceil(total / pageSize))
    const currentPage = Math.min(internalPage, lastPage)
    const from = total > 0 ? (currentPage - 1) * pageSize + 1 : 0
    const to = total > 0 ? Math.min(currentPage * pageSize, total) : 0

    return {
      currentPage,
      lastPage,
      total,
      from,
      to,
    }
  }, [pagination, data.length, pageSize, internalPage])

  const visibleItems = useMemo(() => {
    if (pagination) return data
    const start = (effectivePagination.currentPage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [pagination, data, effectivePagination.currentPage, pageSize])

  const handlePreviousPage = () => {
    if (loading || effectivePagination.currentPage <= 1) return
    const next = effectivePagination.currentPage - 1
    setInternalPage(next)
    onPageChange?.(next)
  }

  const handleNextPage = () => {
    if (loading || effectivePagination.currentPage >= effectivePagination.lastPage) {
      return
    }
    const next = effectivePagination.currentPage + 1
    setInternalPage(next)
    onPageChange?.(next)
  }

  const fromRecord =
    effectivePagination.from ??
    (visibleItems.length > 0
      ? (effectivePagination.currentPage - 1) * pageSize + 1
      : 0)
  const toRecord =
    effectivePagination.to ??
    (visibleItems.length > 0 ? fromRecord + visibleItems.length - 1 : 0)

  return (
    <div className={styles.gridContainerCard}>
      {/* BARRA DE BÚSQUEDA UNIVERSAL */}
      {onSearch && (
        <>
          <form className={styles.searchBar} onSubmit={handleSearchSubmit}>
            <label className={styles.searchInputWrapper}>
              <span className={styles.visuallyHidden}>{searchPlaceholder}</span>
              <SearchIcon className={styles.searchIcon} />
              <input
                type="search"
                className={styles.searchInput}
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </label>

            <button
              type="submit"
              className={styles.searchButton}
              disabled={loading}
            >
              Buscar
            </button>

            {(activeSearch || searchInput) && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClearSearch}
                disabled={loading}
              >
                Limpiar
              </button>
            )}
          </form>

          {activeSearch && (
            <div className={styles.searchResultBanner}>
              Resultados para: <strong>{activeSearch}</strong>
            </div>
          )}
        </>
      )}

      {/* ESTADO DE CARGA */}
      {loading && (
        <div className={styles.stateContainer} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p className={styles.stateText}>Cargando {entityLabel}...</p>
        </div>
      )}

      {/* ESTADO DE ERROR */}
      {!loading && error && (
        <div className={styles.errorBanner} role="alert">
          <div>
            <strong>No se pudo cargar la información</strong>
            <p>{error}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              className={styles.retryButton}
              onClick={onRetry}
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* ESTADO VACÍO */}
      {!loading && !error && visibleItems.length === 0 && (
        <div className={styles.stateContainer}>
          <strong className={styles.emptyTitle}>{emptyTitle}</strong>
          <p className={styles.stateText}>{emptyDescription}</p>
        </div>
      )}

      {/* GRILLA DE TARJETAS (2 COLUMNAS x 5 FILAS) */}
      {!loading && !error && visibleItems.length > 0 && (
        <div className={styles.cardsGrid}>
          {visibleItems.map((item) => (
            <DataCardItem
              key={item.id}
              item={item}
              fields={fields}
              actions={actions}
              renderCustomActions={renderCustomActions}
              routeContext={routeContext}
              labelWidth={labelWidth}
            />
          ))}
        </div>
      )}

      {/* PIE DE PAGINACIÓN */}
      {!loading && !error && effectivePagination.total > 0 && (
        <footer className={styles.paginationFooter}>
          <span className={styles.paginationSummary}>
            Mostrando {fromRecord} a {toRecord} de {effectivePagination.total}{' '}
            {entityLabel}
          </span>

          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageButton}
              disabled={effectivePagination.currentPage <= 1 || loading}
              onClick={handlePreviousPage}
            >
              Anterior
            </button>

            <span className={styles.pageIndicator}>
              Página {effectivePagination.currentPage} de{' '}
              {effectivePagination.lastPage || 1}
            </span>

            <button
              type="button"
              className={styles.pageButton}
              disabled={
                effectivePagination.currentPage >=
                  effectivePagination.lastPage || loading
              }
              onClick={handleNextPage}
            >
              Siguiente
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}