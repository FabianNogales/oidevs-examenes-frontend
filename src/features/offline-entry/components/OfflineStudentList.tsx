import { useId, useState } from 'react'
import { Search, UserCheck } from 'lucide-react'
import { EntryConditionBadge } from '@/features/exams/components/EntryConditionBadge'
import { eligibilityDisplay } from '@/features/exams/utils/entryControlDisplay'
import type { LocalEntry, OfflineStudent } from '../types/offline.types'
import { searchOfflineStudents, studentBlocker, studentName,} from '../utils/offlineRules'
import shared from './styles/OfflineShared.module.css'
import captureStyles from './styles/OfflineCapturePanel.module.css'
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
      className={shared.panel}
      aria-label="Estudiantes de la lista local"
    >
      <h2>Buscar en mi lista</h2>

      <label className={captureStyles.searchField} htmlFor={searchId}>
        SIS, CI, nombre o apellidos
        <div className={captureStyles.searchInputBox}>
          <Search
            size={18}
            strokeWidth={1.75}
            className={captureStyles.searchInputIcon}
            aria-hidden="true"
          />
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
        </div>
      </label>

      <p className={shared.muted}>
        {filtered.length} estudiantes encontrados · Consulta local
      </p>

      {filtered.length === 0 ? (
        <p className={shared.empty}>
          No hay coincidencias en tu lista. No se pueden agregar estudiantes de
          otras listas.
        </p>
      ) : null}

      <ul className={captureStyles.studentList}>
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
            <li key={student.student_id} className={captureStyles.studentCard}>
              <div className={captureStyles.studentInfo}>
                <strong>{studentName(student)}</strong>
                <p className={captureStyles.studentMeta}>
                  SIS {student.sis_code} · CI{' '}
                  {student.identity_number ?? 'No informado'}
                </p>
                <EntryConditionBadge {...eligibilityDisplay(eligibility)} />
                {blocker ? (
                  <small className={captureStyles.studentBlocker}>
                    {blocker}
                  </small>
                ) : null}
              </div>

              <button
                className={buttons.secondaryButton}
                onClick={() => onSelect(student)}
              >
                <UserCheck size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>Verificar identidad</span>
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