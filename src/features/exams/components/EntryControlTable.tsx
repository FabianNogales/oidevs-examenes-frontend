import type {
  EntryControlMeta,
  EntryControlStudent,
} from '../types/entryControl.types'
import {
  eligibilityDisplay,
  entryDisplay,
  entryStudentName,
} from '../utils/entryControlDisplay'
import { EntryConditionBadge } from './EntryConditionBadge'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from '../pages/EntryControlPage.module.css'

type Props = {
  items: EntryControlStudent[]
  meta: EntryControlMeta | null
  loading: boolean
  error: string | null
  onView: (studentId: number) => void
  disabled?: boolean
  manual?: boolean
  canRegister?: (student: EntryControlStudent) => boolean
}

export function EntryControlTable({
  items,
  meta,
  loading,
  error,
  onView,
  disabled = false,
  manual = false,
  canRegister,
}: Props) {
  const rows = items.map((student, index) => ({
    studentId: student.student_id,
    number: (meta ? (meta.current_page - 1) * meta.per_page : 0) + index + 1,
    name: entryStudentName(student),
    expelled: student.is_expelled === true,
    sisCode: student.sis_code,
    eligibility: eligibilityDisplay(student.eligibility_status),
    entry: entryDisplay(student.entry_status),
    actionDisabled: disabled || (manual && !canRegister?.(student)),
  }))
  const emptyMessage = loading
    ? 'Consultando estudiantes…'
    : error
      ? 'No se pudo consultar el listado.'
      : 'No se encontraron estudiantes.'

  return (
    <>
      <div
        className={`${sharedStyles.tableWrap} ${styles.verificationTableWrap}`}
        aria-busy={loading}
      >
        <table
          className={`${sharedStyles.table} ${styles.table}`}
          aria-label="Estudiantes para control de ingreso"
        >
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Estudiante</th>
              <th scope="col">SIS</th>
              {!manual ? <th scope="col">Habilitación</th> : null}
              <th scope="col">Ingreso</th>
              <th scope="col">Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentId}>
                <td>{row.number}</td>
                <td>
                  {row.name}
                  {row.expelled ? (
                    <div>
                      <EntryConditionBadge
                        label="Expulsado de este examen"
                        tone="negative"
                      />
                    </div>
                  ) : null}
                </td>
                <td className={styles.identifier}>{row.sisCode}</td>
                {!manual ? (
                  <td>
                    <EntryConditionBadge {...row.eligibility} />
                  </td>
                ) : null}
                <td>
                  <EntryConditionBadge {...row.entry} />
                </td>
                <td>
                  <button
                    type="button"
                    className={sharedStyles.secondaryButton}
                    disabled={row.actionDisabled}
                    onClick={() => onView(row.studentId)}
                    aria-label={`${manual ? 'Registrar' : 'Ver'} a ${row.name}`}
                  >
                    {manual ? 'Registrar' : 'Ver'}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={manual ? 5 : 6}
                  className={sharedStyles.empty}
                  role="status"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
