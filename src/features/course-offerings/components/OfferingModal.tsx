import type { ReactNode } from 'react'
import { PortalDialog } from '@/shared/components/PortalDialog/PortalDialog'
import styles from '@/features/subjects/components/SubjectDialog.module.css'

export function OfferingModal({
  title,
  busy,
  onClose,
  children,
}: {
  title: string
  busy: boolean
  onClose: () => void
  children: ReactNode
}) {
  return (
    <PortalDialog
      title={title}
      subtitle="Asignaciones de materias"
      busy={busy}
      onClose={onClose}
      className={styles.dialog}
      headerClassName={styles.header}
      bodyClassName={styles.body}
      closeClassName={styles.closeButton}
    >
      {children}
    </PortalDialog>
  )
}
