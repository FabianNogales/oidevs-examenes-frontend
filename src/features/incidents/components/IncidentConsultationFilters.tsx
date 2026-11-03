import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type {
  IncidentConsultationErrors,
  IncidentConsultationFilters as Filters,
} from '../types/incidentConsultation.types'
import { EMPTY_INCIDENT_FILTERS } from '../types/incidentConsultation.types'
import { validateIncidentConsultation } from '../utils/incidentConsultationValidation'
import { INCIDENT_TYPE_LABELS } from '../utils/incidentValidation'
import type { IncidentType } from '../types/incident.types'
import styles from './IncidentConsultation.module.css'

type Props = {
  initial: Filters
  statuses: { value: string; label: string }[]
  onApply: (filters: Filters) => void
}
export function IncidentConsultationFilters({
  initial,
  statuses,
  onApply,
}: Props) {
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<IncidentConsultationErrors>({})
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validateIncidentConsultation({ ...draft, page: 1 })
    setErrors(next)
    if (Object.keys(next).length) {
      const field = Object.keys(next)[0]
      form.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus()
    } else onApply(draft)
  }
  return (
    <form
      ref={form}
      className={styles.filters}
      onSubmit={submit}
      noValidate
      aria-label="Filtros de incidencias"
    >
      <div className={styles.search}>
        <label htmlFor={`${id}-search`}>Buscar incidencia o estudiante</label>
        <input
          id={`${id}-search`}
          name="search"
          type="search"
          placeholder="Nombre, SIS, CI o número de incidencia"
          value={draft.search}
          onChange={(e) => setDraft({ ...draft, search: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor={`${id}-type`}>Tipo de incidencia</label>
        <select
          id={`${id}-type`}
          name="type"
          value={draft.type}
          onChange={(e) =>
            setDraft({ ...draft, type: e.target.value as IncidentType | '' })
          }
        >
          <option value="">Todos los tipos</option>
          {Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-status`}>Estado</label>
        <select
          id={`${id}-status`}
          name="status"
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        >
          <option value="">Todos los estados</option>
          {draft.status && !statuses.some((s) => s.value === draft.status) && (
            <option value={draft.status}>{draft.status}</option>
          )}
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {(['date_from', 'date_to'] as const).map((field) => (
        <div key={field}>
          <label htmlFor={`${id}-${field}`}>
            {field === 'date_from' ? 'Desde' : 'Hasta'}
          </label>
          <input
            id={`${id}-${field}`}
            name={field}
            type="date"
            value={draft[field]}
            aria-invalid={!!errors[field]}
            aria-describedby={
              errors[field] ? `${id}-${field}-error` : undefined
            }
            onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
          />
          {errors[field] && (
            <p id={`${id}-${field}-error`} className={styles.error}>
              {errors[field]}
            </p>
          )}
        </div>
      ))}
      <div className={styles.actions}>
        <button type="submit">Buscar</button>
        <button
          type="button"
          onClick={() => {
            setErrors({})
            setDraft(EMPTY_INCIDENT_FILTERS)
            onApply(EMPTY_INCIDENT_FILTERS)
          }}
        >
          Limpiar filtros
        </button>
      </div>
      <p className={styles.help}>
        Las fechas corresponden a Bolivia (UTC−4). Los filtros se aplican al
        pulsar Buscar.
      </p>
    </form>
  )
}
