import type { ReactNode } from 'react'
import { PortalDialog } from '@/shared/components/PortalDialog/PortalDialog'
import styles from './AcademicTermModal.module.css'

export function AcademicTermModal({
  title,
  busy = false,
  onClose,
  children,
}: {
  title: string
  busy?: boolean
  onClose: () => void
  children: ReactNode
}) {
  return (
    <PortalDialog
      title={title}
      subtitle="Periodos académicos"
      busy={busy}
      onClose={onClose}
      className={styles.dialog}
      headerClassName={styles.header}
      bodyClassName={styles.body}
      closeClassName={styles.closeButton}
      restoreFocusId="academic-terms-title"
    >
      {children}
    </PortalDialog>
  )
}
