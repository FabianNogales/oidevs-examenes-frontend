import { useState, type FormEvent } from 'react'
import type {
  AcademicTermsQuery,
  AcademicTermStatus,
} from '../types/academicTerm.types'
import styles from '../pages/AdminAcademicTermsPage.module.css'

export function AcademicTermsFilters({
  query,
  onChange,
}: {
  query: AcademicTermsQuery
  onChange: (query: AcademicTermsQuery) => void
}) {
  const [search, setSearch] = useState(query.search)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onChange({ ...query, search: search.trim(), page: 1 })
  }
  return (
    <form
      className={styles.searchBar}
      role="search"
      aria-label="Buscar periodos académicos"
      onSubmit={submit}
    >
      <div className={styles.searchField}>
        <label className={styles.srOnly} htmlFor="academic-terms-search">
          Buscar por nombre del periodo
        </label>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
        <input
          id="academic-terms-search"
          type="search"
          maxLength={150}
          placeholder="Buscar por nombre del periodo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <label className={styles.filter}>
        Estado
        <select
          value={query.status}
          onChange={(event) =>
            onChange({
              ...query,
              status: event.target.value as AcademicTermStatus | '',
              page: 1,
            })
          }
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </select>
      </label>
      <button type="submit" className={styles.primaryButton}>
        Buscar
      </button>
      {(query.search || query.status || search) && (
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setSearch('')
            onChange({ page: 1, search: '', status: '' })
          }}
        >
          Limpiar filtros
        </button>
      )}
    </form>
  )
}
