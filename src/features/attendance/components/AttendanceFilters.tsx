import { useState } from 'react'
import type { FormEvent } from 'react'
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
        <select
          value={view}
          onChange={(e) => onChange({ view: e.target.value })}
        >
          <option value="all">Todos</option>
          <option value="registered">Con ingreso válido</option>
          <option value="pending">Pendientes de ingreso</option>
        </select>
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
