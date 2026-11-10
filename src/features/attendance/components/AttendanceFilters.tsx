import { useState } from 'react'
import type { FormEvent } from 'react'
import { Dropdown } from '@/shared/components/ui/Dropdown'
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
  function submit(e: FormEvent) {
    e.preventDefault()
    onChange({ search: draft.trim() })
  }
  return (
    <form onSubmit={submit} className={styles.filters}>
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
      <label>
        Buscar estudiante
        <input
          type="search"
          value={draft}
          maxLength={255}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nombre, SIS o CI"
        />
      </label>
      <button type="submit">Buscar</button>
    </form>
  )
}
