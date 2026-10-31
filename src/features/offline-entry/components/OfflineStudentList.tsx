import { useId, useState } from 'react'
import { EntryConditionBadge } from '@/features/exams/components/EntryConditionBadge'
import { eligibilityDisplay } from '@/features/exams/utils/entryControlDisplay'
import type { LocalEntry, OfflineStudent } from '../types/offline.types'
import {
  searchOfflineStudents,
  studentBlocker,
  studentName,
} from '../utils/offlineRules'
import styles from './OfflineEntry.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

export function OfflineStudentList({
  students,
  entries,
  onSelect,
}: {
  students: OfflineStudent[]
  entries: LocalEntry[]
  onSelect: (student: OfflineStudent) => void
}) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(25)
  const searchId = useId()
  const filtered = searchOfflineStudents(students, query)
  return (
    <section
      className={styles.panel}
      aria-label="Estudiantes de la lista local"
    >
      <h2>Buscar en mi lista</h2>
      <label className={styles.search} htmlFor={searchId}>
        SIS, CI, nombre o apellidos
        <input
          id={searchId}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setLimit(25)
          }}
          placeholder="Buscar estudiante…"
        />
      </label>
      <p className={styles.muted}>
        {filtered.length} estudiantes encontrados · Consulta local
      </p>
      {filtered.length === 0 ? (
        <p className={styles.empty}>
          No hay coincidencias en tu lista. No se pueden agregar estudiantes de
          otras listas.
        </p>
      ) : null}
      <ul className={styles.studentList}>
        {filtered.slice(0, limit).map((student) => {
          const blocker = studentBlocker(student, entries)
          const eligibility =
            student.eligibility_status === 'ELIGIBLE'
              ? 'ELIGIBLE'
              : ['INELIGIBLE', 'NOT_ELIGIBLE'].includes(
                    student.eligibility_status ?? '',
                  )
                ? 'INELIGIBLE'
                : null
          return (
            <li key={student.student_id} className={styles.student}>
              <div>
                <strong>{studentName(student)}</strong>
                <p>
                  SIS {student.sis_code} · CI{' '}
                  {student.identity_number ?? 'No informado'}
                </p>
                <EntryConditionBadge {...eligibilityDisplay(eligibility)} />
                {blocker ? <small>{blocker}</small> : null}
              </div>
              <button
                className={buttons.secondaryButton}
                onClick={() => onSelect(student)}
              >
                Verificar identidad
              </button>
            </li>
          )
        })}
      </ul>
      {filtered.length > limit ? (
        <button
          className={buttons.secondaryButton}
          onClick={() => setLimit((value) => value + 25)}
        >
          Mostrar 25 más
        </button>
      ) : null}
    </section>
  )
}
