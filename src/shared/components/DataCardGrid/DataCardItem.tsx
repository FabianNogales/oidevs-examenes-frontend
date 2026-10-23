import type { CSSProperties } from 'react'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import type { CardActionVariant, DataCardItemProps } from './dataCardGrid.types'
import styles from './DataCardGrid.module.css'

const ACTION_VARIANT_CLASS: Record<CardActionVariant, string> = {
  primary: styles.actionBtnPrimary,
  secondary: styles.actionBtnSecondary,
  outline: styles.actionBtnOutline,
  success: styles.actionBtnSuccess,
  danger: styles.actionBtnDanger,
}

export function DataCardItem<T extends BaseTableEntity>({
  item,
  fields,
  actions = [],
  renderCustomActions,
  routeContext,
  labelWidth = '96px',
}: DataCardItemProps<T>) {
  // Filtra las acciones según la ruta activa y permisos declarados (Principio Open/Closed)
  const visibleActions = actions.filter((action) => {
    if (
      action.allowedRoles &&
      !action.allowedRoles.includes(routeContext.accessRole)
    ) {
      return false
    }

    if (
      action.allowedScopes &&
      !action.allowedScopes.includes(routeContext.moduleScope)
    ) {
      return false
    }

    if (action.isVisible && !action.isVisible(item, routeContext)) {
      return false
    }

    return true
  })

  const customActionNode = renderCustomActions?.(item, routeContext)
  const hasAnyAction = visibleActions.length > 0 || Boolean(customActionNode)

  const customStyle = {
    '--card-label-width': labelWidth,
  } as CSSProperties

  return (
    <article className={styles.cardItem} style={customStyle}>
      <div className={styles.cardFieldsList}>
        {fields.map((field) => {
          const content = field.cell
            ? field.cell(item, routeContext)
            : field.accessorKey
              ? String(item[field.accessorKey] ?? '')
              : null

          return (
            <div key={field.id} className={styles.fieldRow}>
              <span className={styles.fieldLabel}>{field.label}</span>
              <div className={styles.fieldValue}>{content}</div>
            </div>
          )
        })}
      </div>

      {hasAnyAction && (
        <div className={styles.cardActionsRow}>
          <span className={styles.fieldLabel}>Acciones</span>
          <div className={styles.cardActionsGroup}>
            {visibleActions.map((action) => {
              const resolvedLabel =
                typeof action.label === 'function'
                  ? action.label(item)
                  : action.label

              const resolvedVariant =
                typeof action.variant === 'function'
                  ? action.variant(item)
                  : (action.variant ?? 'secondary')

              const disabled =
                action.isDisabled?.(item, routeContext) ?? false

              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={disabled}
                  className={`${styles.actionBtn} ${ACTION_VARIANT_CLASS[resolvedVariant]}`}
                  onClick={() => action.onClick(item, routeContext)}
                >
                  {action.icon}
                  <span>{resolvedLabel}</span>
                </button>
              )
            })}
            {customActionNode}
          </div>
        </div>
      )}
    </article>
  )
}