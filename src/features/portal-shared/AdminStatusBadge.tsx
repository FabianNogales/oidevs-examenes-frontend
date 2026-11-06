import type { ReactNode } from 'react'
import styles from './adminStatusBadge.module.css'

const labels = {
  PUBLISHED: 'Publicado',
  DRAFT: 'Borrador',
  UNPUBLISHED: 'Despublicado',
  ARCHIVED: 'Archivado',
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  PENDING_CHANGES: 'Cambios pendientes',
  CANCELLED: 'Cancelado',
} as const

/** Presentation only: callers retain their own domain states and labels. */
export function AdminStatusBadge({
  status,
  children,
}: {
  status: keyof typeof labels
  children?: ReactNode
}) {
  return (
    <span className={styles.badge} data-status={status}>
      {children ?? labels[status]}
    </span>
  )
}
