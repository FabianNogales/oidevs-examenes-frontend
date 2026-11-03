import { useEffect, useId, useState } from 'react'
import {
  getEntryControlStudents,
  getEntryControlErrorMessage,
} from '@/features/exams/api/entryControlApi'
import type { EntryControlStudent } from '@/features/exams/types/entryControl.types'
import type { IncidentStudent } from '../types/incident.types'
import styles from './IncidentForm.module.css'
import { incidentStudent } from '../utils/incidentEntryContext'

export function IncidentStudentPicker({
  value,
  onChange,
  disabled,
  examId,
  emptyMessage = 'No se encontraron estudiantes. Prueba con otro dato o registra sin identificar.',
}: {
  value: IncidentStudent | null
  onChange: (student: IncidentStudent | null) => void
  disabled: boolean
  examId: number
  emptyMessage?: string
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [version, setVersion] = useState(0)
  const search = query.trim()
  const key = `${examId}:${search}:${version}`
  const [state, setState] = useState<{
    key: string
    students: EntryControlStudent[]
    error: string | null
  }>({ key: '', students: [], error: null })
  useEffect(() => {
    if (!search || value || disabled) return
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      void getEntryControlStudents(
        examId,
        { search, page: 1, per_page: 10 },
        controller.signal,
      ).then(
        (response) => {
          if (!controller.signal.aborted)
            setState(
              response?.exam?.id === examId &&
                Array.isArray(response.data) &&
                response.data.every(
                  (student) => incidentStudent(student) !== null,
                )
                ? { key, students: response.data, error: null }
                : {
                    key,
                    students: [],
                    error: 'La respuesta no corresponde a este examen.',
                  },
            )
        },
        (error) => {
          if (!controller.signal.aborted)
            setState({
              key,
              students: [],
              error: getEntryControlErrorMessage(error),
            })
        },
      )
    }, 300)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [examId, search, key, value, disabled])
  const current = state.key === key
  return (
    <div>
      {value ? (
        <div className={styles.selected}>
          <span>
            <strong>
              {value.first_names} {value.last_names}
            </strong>
            <small>SIS {value.sis_code}</small>
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(null)
              setQuery('')
            }}
          >
            Cambiar estudiante
          </button>
        </div>
      ) : (
        <>
          <label htmlFor={id}>Buscar estudiante por nombre, SIS o CI</label>
          <input
            id={id}
            type="search"
            value={query}
            disabled={disabled}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
          {!search ? (
            <p>Busca y selecciona un estudiante del examen.</p>
          ) : !current ? (
            <p role="status">Buscando estudiantes…</p>
          ) : state.error ? (
            <div role="alert">
              <p>{state.error}</p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setVersion((v) => v + 1)}
              >
                Reintentar búsqueda
              </button>
            </div>
          ) : state.students.length ? (
            <ul
              className={styles.results}
              aria-label="Resultados de estudiantes"
            >
              {state.students.map((student) => (
                <li key={student.student_id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        id: student.student_id,
                        first_names: student.first_names,
                        last_names: student.last_names,
                        sis_code: student.sis_code,
                        identity_number: student.identity_number,
                      })
                    }
                  >
                    <strong>
                      {student.first_names} {student.last_names}
                    </strong>
                    <small>
                      SIS {student.sis_code}
                      {student.identity_number
                        ? ` · CI ${student.identity_number}`
                        : ''}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">{emptyMessage}</p>
          )}
        </>
      )}
    </div>
  )
}
