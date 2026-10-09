import type { ExamEligibility } from '../types/eligibility.types'
import {
  ELIGIBILITY_LABELS,
  getEligibilityStudentName,
} from '../utils/eligibilityDisplay'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from '../pages/Eligibilities.module.css'

type Props = {
  items: ExamEligibility[]
  emptyMessage: string
  loading: boolean
  startIndex?: number
  onManage: (item: ExamEligibility) => void
}

export function EligibilityTable({
  items,
  emptyMessage,
  loading,
  startIndex = 0,
  onManage,
}: Props) {
  return (
    <div
      className={`${sharedStyles.tableWrap} ${styles.tableWrap}`}
      aria-busy={loading}
    >
      <table
        className={`${sharedStyles.table} ${styles.table}`}
        aria-label="Habilitaciones de estudiantes"
      >
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Estudiante</th>
            <th scope="col">SIS</th>
            <th scope="col">Habilitación</th>
            <th scope="col">Motivo</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td>{startIndex + index + 1}</td>
              <td className={styles.studentName}>
                {getEligibilityStudentName(item)}
              </td>
              <td className={styles.sisCode}>{item.sis_code}</td>
              <td>
                <span
                  className={`${styles.badge} ${item.status === 'ELIGIBLE' ? styles.eligible : styles.ineligible}`}
                >
                  {ELIGIBILITY_LABELS[item.status]}
                </span>
              </td>
              <td>
                <span className={styles.reason} title={item.reason ?? undefined}>
                  {item.reason ?? '—'}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  className={`${sharedStyles.secondaryButton} ${styles.manageButton}`}
                  onClick={() => onManage(item)}
                  aria-label={`Gestionar habilitación de ${getEligibilityStudentName(item)}`}
                >
                  Gestionar
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className={sharedStyles.empty} role="status">
                {loading ? 'Cargando habilitaciones…' : emptyMessage}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
