import type { ReactNode } from 'react'
import { PortalDialog } from '@/shared/components/PortalDialog/PortalDialog'
import styles from './SubjectDialog.module.css'

export function SubjectModal({
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
      subtitle="Gestión de materias"
      busy={busy}
      onClose={onClose}
      className={styles.dialog}
      headerClassName={styles.header}
      bodyClassName={styles.body}
      closeClassName={styles.closeButton}
      initialFocusSelector='[name="code"]'
      restoreFocusId="subjects-title"
    >
      {children}
    </PortalDialog>
  )
}
