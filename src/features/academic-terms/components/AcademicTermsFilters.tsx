import { useState } from 'react'
import { Dropdown } from '@/shared/components/ui/Dropdown'
import { SearchBar } from '@/shared/components/ui/SearchBar'
import type {
  AcademicTermsQuery,
  AcademicTermStatus,
} from '../types/academicTerm.types'
import styles from '../pages/AdminAcademicTermsPage.module.css'
import { Button } from '@/shared/components/ui/Button/Button'

export function AcademicTermsFilters({
  query,
  onChange,
}: {
  query: AcademicTermsQuery
  onChange: (query: AcademicTermsQuery) => void
}) {
  const [search, setSearch] = useState(query.search)

  return (
    <div className={styles.searchBar}>
      <SearchBar
        id="academic-terms-search"
        value={search}
        onChange={setSearch}
        onSubmit={(nextSearch) =>
          onChange({ ...query, search: nextSearch, page: 1 })
        }
        onClear={() => {
          setSearch('')
          onChange({ ...query, search: '', page: 1 })
        }}
        placeholder="Buscar por nombre del periodo"
        label="Buscar periodos académicos"
        showClear={Boolean(query.search)}
      />
      <div className={styles.filterGroup} role="group" aria-label="Filtros">
        <label className={styles.filter}>
          Estado
          <Dropdown<AcademicTermStatus | ''>
            value={query.status}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'ACTIVE', label: 'Activos' },
              { value: 'INACTIVE', label: 'Inactivos' },
            ]}
            onChange={(status) =>
              onChange({
                ...query,
                status,
                page: 1,
              })
            }
          />
        </label>
        {(query.search || query.status || search) && (
          <Button
            variant="secondary"
            onClick={() => {
              setSearch('')
              onChange({ page: 1, search: '', status: '' })
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
