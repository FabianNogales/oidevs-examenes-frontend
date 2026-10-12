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
}

export function EntryControlTable({
  items,
  meta,
  loading,
  error,
  onView,
}: Props) {
  const rows = items.map((student, index) => ({
    studentId: student.student_id,
    number: (meta ? (meta.current_page - 1) * meta.per_page : 0) + index + 1,
    name: entryStudentName(student),
    sisCode: student.sis_code,
    eligibility: eligibilityDisplay(student.eligibility_status),
    entry: entryDisplay(student.entry_status),
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
              <th scope="col">Habilitación</th>
              <th scope="col">Ingreso</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentId}>
                <td>{row.number}</td>
                <td>{row.name}</td>
                <td className={styles.identifier}>{row.sisCode}</td>
                <td>
                  <EntryConditionBadge {...row.eligibility} />
                </td>
                <td>
                  <EntryConditionBadge {...row.entry} />
                </td>
                <td>
                  <button
                    type="button"
                    className={sharedStyles.secondaryButton}
                    onClick={() => onView(row.studentId)}
                    aria-label={`Ver a ${row.name}`}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className={sharedStyles.empty} role="status">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className={styles.verificationCards} aria-busy={loading}>
        {rows.length ? (
          <ul
            className={styles.verificationCardList}
            role="list"
            aria-label="Estudiantes para control de ingreso"
          >
            {rows.map((row) => (
              <li key={row.studentId} className={styles.verificationCard}>
                <span className={styles.verificationCardNumber}>
                  #{row.number}
                </span>
                <h3>{row.name}</h3>
                <p className={styles.verificationCardSis}>SIS: {row.sisCode}</p>
                <dl className={styles.verificationCardStatuses}>
                  <div>
                    <dt>Habilitación</dt>
                    <dd>
                      <EntryConditionBadge {...row.eligibility} />
                    </dd>
                  </div>
                  <div>
                    <dt>Ingreso</dt>
                    <dd>
                      <EntryConditionBadge {...row.entry} />
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className={`${sharedStyles.secondaryButton} ${styles.verificationCardButton}`}
                  onClick={() => onView(row.studentId)}
                  aria-label={`Ver información de ${row.name}`}
                >
                  Ver información
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={sharedStyles.empty} role="status">
            {emptyMessage}
          </p>
        )}
      </div>
    </>
  )
}
