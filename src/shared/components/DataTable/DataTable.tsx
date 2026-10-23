import { useState, type FormEvent } from 'react'
import type { BaseTableEntity, DataTableProps } from './dataTable.types'
import { DataTableRow } from './DataTableRow'
import styles from './DataTable.module.css'

export function DataTable<T extends BaseTableEntity>({
  columns,
  viewActionLabel,
  data,
  loading,
  error = null,
  pagination = null,
  entityLabel = 'registros',
  searchPlaceholder = 'Buscar por nombre, apellido, correo o código institucional',
  initialSearch = '',
  onSearch,
  onPageChange,
  onRetry,
  emptyTitle = 'No se encontraron registros',
  emptyDescription = 'Intenta con otros términos de búsqueda o verifica que existan datos registrados.',
  getProfilePath,
  onViewProfile,
  onToggleStatus,
}: DataTableProps<T>) {
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [activeSearch, setActiveSearch] = useState(initialSearch)

  const hasActions = Boolean(getProfilePath || onViewProfile || onToggleStatus)

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchInput.trim()
    setActiveSearch(trimmed)
    onSearch?.(trimmed)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setActiveSearch('')
    onSearch?.('')
  }

  const handlePreviousPage = () => {
    if (!pagination || loading || pagination.currentPage <= 1) return
    onPageChange?.(pagination.currentPage - 1)
  }

  const handleNextPage = () => {
    if (!pagination || loading || pagination.currentPage >= pagination.lastPage) return
    onPageChange?.(pagination.currentPage + 1)
  }

  // Cálculo limpio del rango "Mostrando X a Y de Z" igual al mockup
  const fromRecord =
    pagination?.from ??
    (pagination && data.length > 0 ? (pagination.currentPage - 1) * 10 + 1 : 0)
  const toRecord =
    pagination?.to ??
    (pagination && data.length > 0 ? fromRecord + data.length - 1 : 0)

  return (
    <div className={styles.tableCard}>
      {/* BARRA DE BÚSQUEDA UNIVERSAL */}
      {onSearch && (
        <>
          <form className={styles.searchBar} onSubmit={handleSearchSubmit}>
            <label className={styles.searchInputWrapper}>
              <span className={styles.visuallyHidden}>{searchPlaceholder}</span>
              <svg
                className={styles.searchIcon}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
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
          <div className={styles.errorContent}>
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
      {!loading && !error && data.length === 0 && (
        <div className={styles.stateContainer}>
          <strong className={styles.emptyTitle}>{emptyTitle}</strong>
          <p className={styles.stateText}>{emptyDescription}</p>
        </div>
      )}

      {/* CUERPO DE LA TABLA */}
      {!loading && !error && data.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <colgroup>
              {columns.map((col) => (
                <col key={col.id} style={{ width: col.width ?? 'auto' }} />
              ))}
              {hasActions && <col style={{ width: '240px' }} />}
            </colgroup>

            <thead>
              <tr>
                {columns.map((col) => {
                  const alignClass =
                    col.align === 'right'
                      ? styles.textRight
                      : col.align === 'center'
                        ? styles.textCenter
                        : styles.textLeft

                  return (
                    <th
                      scope="col"
                      key={col.id}
                      style={{ width: col.width }}
                      className={alignClass}
                    >
                      {col.header}
                    </th>
                  )
                })}
                {hasActions && (
                  <th scope="col" className={styles.textRight}>Acciones</th>
                )}
              </tr>
            </thead>

            <tbody>
              {data.map((item) => (
                <DataTableRow
                  key={item.id}
                  item={item}
                  viewActionLabel={viewActionLabel}
                  columns={columns}
                  profilePath={getProfilePath ? getProfilePath(item) : undefined}
                  onViewProfile={onViewProfile}
                  onToggleStatus={onToggleStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PIE DE PAGINACIÓN IDÉNTICO AL MOCKUP */}
      {!loading && !error && pagination && pagination.total > 0 && (
        <footer className={styles.paginationFooter}>
          <span className={styles.paginationSummary}>
            Mostrando {fromRecord} a {toRecord} de {pagination.total} {entityLabel}
          </span>

          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageButton}
              disabled={pagination.currentPage <= 1 || loading}
              onClick={handlePreviousPage}
            >
              Anterior
            </button>

            <span className={styles.pageIndicator}>
              Página {pagination.currentPage} de {pagination.lastPage || 1}
            </span>

            <button
              type="button"
              className={styles.pageButton}
              disabled={pagination.currentPage >= pagination.lastPage || loading}
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
