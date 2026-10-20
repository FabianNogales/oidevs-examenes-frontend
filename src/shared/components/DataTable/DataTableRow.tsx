import { useNavigate } from 'react-router'
import type { BaseTableEntity, DataTableRowProps } from './dataTable.types'
import styles from './DataTable.module.css'

export function DataTableRow<T extends BaseTableEntity>({
  item,
  viewActionLabel = 'Ver perfil',
  columns,
  profilePath,
  onViewProfile,
  onToggleStatus,
}: DataTableRowProps<T>) {
  const navigate = useNavigate()
  const isActive = item.status === 'ACTIVE'
  const hasActions = Boolean(profilePath || onViewProfile || onToggleStatus)

  const handleProfileClick = () => {
    if (profilePath) {
      navigate(profilePath)
      return
    }
    onViewProfile?.(item)
  }

  return (
    <tr className={styles.tableRow}>
      {columns.map((col) => {
        const alignClass =
          col.align === 'right'
            ? styles.textRight
            : col.align === 'center'
              ? styles.textCenter
              : styles.textLeft

        let content = col.cell
          ? col.cell(item)
          : col.accessorKey
            ? String(item[col.accessorKey] ?? '')
            : null

        if (!col.cell && col.accessorKey === 'status' && item.status) {
          content = (
            <span
              className={`${styles.statusBadge} ${
                isActive ? styles.statusActive : styles.statusInactive
              }`}
            >
              <span className={styles.statusDot} aria-hidden="true" />
              {isActive ? 'Activo' : 'Inactivo'}
            </span>
          )
        }

        return (
          <td
            key={col.id}
            data-label={col.header}
            className={`${styles.tableCell} ${alignClass}`}
          >
            {content}
          </td>
        )
      })}

      {hasActions && (
        <td data-label="Acciones" className={`${styles.tableCell} ${styles.actionsCell}`}>
          <div className={styles.actionButtons}>
            {(profilePath || onViewProfile) && (
              <button
                type="button"
                className={styles.btnViewProfile}
                onClick={handleProfileClick}
              >
                {viewActionLabel}
              </button>
            )}

            {onToggleStatus && item.status && (
              <button
                type="button"
                className={isActive ? styles.btnDeactivate : styles.btnActivate}
                onClick={() => onToggleStatus(item)}
              >
                {isActive ? 'Desactivar' : 'Activar'}
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}
