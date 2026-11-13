import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useControllableState } from '@/shared/hooks/useControllableState'
import styles from './Pagination.module.css'

export interface PaginationProps {
  /** Controlled current page (1-indexed). */
  page?: number
  /** Initial page when uncontrolled (defaults to 1). */
  defaultPage?: number
  /** Total number of pages (>= 1). */
  totalPages: number
  /** Callback fired when the user navigates to a new page. */
  onPageChange?: (nextPage: number) => void
  /** Optional summary text (e.g. "Mostrando 1 a 10 de 42 registros"). */
  summary?: string
  /** Disables navigation controls (e.g. while loading). */
  disabled?: boolean
  /** Accessible label for the `<nav>` landmark. */
  ariaLabel?: string
  className?: string
}

export function getPaginationRange(
  currentPage: number,
  totalPages: number,
): ReadonlyArray<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) pages.push('ellipsis')
  for (let p = start; p <= end; p += 1) {
    pages.push(p)
  }
  if (end < totalPages - 1) pages.push('ellipsis')
  pages.push(totalPages)
  return pages
}

/**
 * Global Pagination molecule: supports controlled (`page` + `onPageChange`) or
 * uncontrolled (`defaultPage`) state, with `<nav aria-label="Paginación">` and `aria-current="page"`.
 */
export function Pagination({
  page,
  defaultPage = 1,
  totalPages,
  onPageChange,
  summary,
  disabled = false,
  ariaLabel = 'Paginación',
  className,
}: PaginationProps) {
  const safeTotal = Math.max(1, totalPages)
  const [currentPage, setCurrentPage] = useControllableState<number>({
    value: page,
    defaultValue: defaultPage,
    onChange: onPageChange,
  })

  const clampedPage = Math.min(Math.max(1, currentPage), safeTotal)
  const range = getPaginationRange(clampedPage, safeTotal)

  function goToPage(target: number) {
    if (disabled) return
    const next = Math.min(Math.max(1, target), safeTotal)
    if (next !== clampedPage) {
      setCurrentPage(next)
    }
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={[styles.pagination, className].filter(Boolean).join(' ')}
    >
      {summary ? <span className={styles.summary}>{summary}</span> : null}

      <div className={styles.controls}>
        <button
          type="button"
          data-ds-button=""
          className={styles.navButton}
          disabled={disabled || clampedPage <= 1}
          onClick={() => goToPage(clampedPage - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Anterior</span>
        </button>

        <ul className={styles.pageList}>
          {range.map((entry, idx) =>
            entry === 'ellipsis' ? (
              <li
                key={`ellipsis-${idx}`}
                className={styles.ellipsis}
                aria-hidden="true"
              >
                …
              </li>
            ) : (
              <li key={entry}>
                <button
                  type="button"
                  data-ds-button=""
                  disabled={disabled}
                  aria-current={entry === clampedPage ? 'page' : undefined}
                  aria-label={`Página ${entry}`}
                  className={[
                    styles.pageButton,
                    entry === clampedPage ? styles.pageButtonActive : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => goToPage(entry)}
                >
                  {entry}
                </button>
              </li>
            ),
          )}
        </ul>

        <button
          type="button"
          data-ds-button=""
          className={styles.navButton}
          disabled={disabled || clampedPage >= safeTotal}
          onClick={() => goToPage(clampedPage + 1)}
          aria-label="Página siguiente"
        >
          <span>Siguiente</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
