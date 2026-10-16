import type { AcademicTermStatus } from '../types/academicTerm.types'
import styles from '../pages/AdminAcademicTermsPage.module.css'

export function AcademicTermStatusBadge({
  status,
}: {
  status: AcademicTermStatus
}) {
  return (
    <span
      className={
        status === 'ACTIVE' ? styles.successBadge : styles.inactiveBadge
      }
    >
      {status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}
    </span>
  )
}
