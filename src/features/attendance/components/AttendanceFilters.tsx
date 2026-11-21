import { useState } from 'react'
import { Dropdown } from '@/shared/components/ui/Dropdown'
import { SearchBar } from '@/shared/components/ui/SearchBar'
import type { AttendanceQuery } from '../types/attendance.types'
import styles from '../pages/Attendance.module.css'

export function AttendanceFilters({
  view,
  search,
  onChange,
}: {
  view: AttendanceQuery['view']
  search: string
  onChange: (patch: Record<string, string>) => void
}) {
  const [draft, setDraft] = useState(search)

  return (
    <div className={styles.filters}>
      <SearchBar
        value={draft}
        onChange={setDraft}
        onSubmit={(nextSearch) => onChange({ search: nextSearch })}
        onClear={() => {
          setDraft('')
          onChange({ search: '' })
        }}
        label="Buscar estudiante"
        showLabel
        placeholder="Nombre, SIS o CI"
        showClear={Boolean(search)}
      />
      <div role="group" aria-label="Filtros de asistencia">
        <label>
          Asistencia
          <Dropdown
            value={view}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'registered', label: 'Con ingreso válido' },
              { value: 'pending', label: 'Pendientes de ingreso' },
            ]}
            onChange={(nextView) => onChange({ view: nextView })}
          />
        </label>
      </div>
    </div>
  )
}
