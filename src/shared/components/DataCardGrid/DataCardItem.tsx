import { isValidElement, type CSSProperties, type ReactNode } from 'react'
import { GraduationCap } from 'lucide-react'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import { Icon } from '@/shared/components/ui/Icon/Icon'
import type {
  CardActionVariant,
  DataCardItemProps,
  DataCardShowcaseConfig,
  DataCardSplitField,
} from './dataCardGrid.types'
import styles from './DataCardGrid.module.css'

function isSplitField(value: unknown): value is DataCardSplitField {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isValidElement(value) &&
    'label' in value &&
    'value' in value
  )
}

function renderLabeledMeta(meta: ReactNode | DataCardSplitField) {
  if (isSplitField(meta)) {
    return (
      <>
        <span className={styles.cardMetaLabel}>{meta.label}: </span>
        <span className={styles.cardMetaValue}>{meta.value}</span>
      </>
    )
  }

  return meta
}

const ACTION_VARIANT_CLASS: Record<CardActionVariant, string> = {
  primary: styles.actionBtnPrimary,
  secondary: styles.actionBtnSecondary,
  outline: styles.actionBtnOutline,
  success: styles.actionBtnSuccess,
  danger: styles.actionBtnDanger,
}

function buildFallbackShowcaseConfig<T extends BaseTableEntity>(
  item: T,
  fields: DataCardItemProps<T>['fields'],
  routeContext: DataCardItemProps<T>['routeContext'],
): DataCardShowcaseConfig {
  const record = item as Record<string, unknown>

  if (typeof record.subjectName === 'string') {
    const subjectCode =
      typeof record.subjectCode === 'string' ? record.subjectCode : ''
    const groupCode =
      typeof record.groupCode === 'string' ? record.groupCode : ''
    const academicTerm =
      typeof record.academicTerm === 'string' ? record.academicTerm : ''
    const teacherFullName =
      typeof record.teacherFullName === 'string' ? record.teacherFullName : ''
    const teacherEmail =
      typeof record.teacherEmail === 'string' ? record.teacherEmail : ''
    const careers = Array.isArray(record.careers)
      ? (record.careers as string[]).join(' - ')
      : ''

    return {
      badgeLabel: 'MATERIA',
      title: record.subjectName,
      headline: subjectCode ? { label: 'Código', value: subjectCode } : undefined,
      splitLeft: groupCode
        ? { label: 'Grupo', value: `Grupo ${groupCode}` }
        : undefined,
      splitRight: academicTerm
        ? { label: 'Gestión', value: academicTerm }
        : undefined,
      primaryMeta: teacherFullName
        ? { label: 'Docente', value: teacherFullName }
        : careers
          ? { label: 'Carrera(s)', value: careers }
          : undefined,
      secondaryMeta: teacherEmail
        ? { label: 'Correo', value: teacherEmail }
        : undefined,
    }
  }

  const resolvedFields = fields.map((field) => ({
    id: field.id,
    label: field.label,
    value: field.cell
      ? field.cell(item, routeContext)
      : field.accessorKey
        ? String(item[field.accessorKey] ?? '')
        : null,
  }))

  return {
    badgeLabel: resolvedFields[0]?.label?.toUpperCase() ?? 'REGISTRO',
    title: resolvedFields[0]?.value ?? `#${String(item.id)}`,
    headline: resolvedFields[1]?.value,
    splitLeft: resolvedFields[2]
      ? { label: resolvedFields[2].label, value: resolvedFields[2].value }
      : undefined,
    splitRight: resolvedFields[3]
      ? { label: resolvedFields[3].label, value: resolvedFields[3].value }
      : undefined,
    primaryMeta: resolvedFields[4]?.value,
    footerMeta: resolvedFields[5]?.value,
  }
}

export function DataCardItem<T extends BaseTableEntity>({
  item,
  fields,
  getCardConfig,
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

  const config = getCardConfig
    ? getCardConfig(item, routeContext)
    : buildFallbackShowcaseConfig(item, fields, routeContext)

  const hasSplitSection = Boolean(config.splitLeft || config.splitRight)
  const hasFooterSection = Boolean(
    config.footerMeta || config.footerExtra || hasAnyAction,
  )

  const badgeToneClass =
    config.badgeTone === 'success'
      ? styles.cardCategoryPillSuccess
      : config.badgeTone === 'neutral'
        ? styles.cardCategoryPillNeutral
        : ''

  const splitSectionNode = hasSplitSection ? (
    <div className={styles.cardSplitRow}>
      <div className={styles.cardSplitCol}>
        {config.splitLeft && (
          <>
            <span className={styles.cardSplitLabel}>
              {config.splitLeft.label}:{' '}
            </span>
            <strong className={styles.cardSplitValue}>
              {config.splitLeft.value}
            </strong>
          </>
        )}
      </div>

      {config.splitLeft && config.splitRight && (
        <span className={styles.cardSplitDivider} aria-hidden="true" />
      )}

      <div className={styles.cardSplitCol}>
        {config.splitRight && (
          <>
            <span className={styles.cardSplitLabel}>
              {config.splitRight.label}:{' '}
            </span>
            <strong className={styles.cardSplitValue}>
              {config.splitRight.value}
            </strong>
          </>
        )}
      </div>
    </div>
  ) : null

  return (
    <article className={styles.cardItem} style={customStyle}>
      <div className={styles.cardTopRow}>
        <div className={styles.cardTopTab}>
          <span className={styles.cardSubjectIconBox} aria-hidden="true">
            {config.headerIcon ?? <Icon icon={GraduationCap} size="md" />}
          </span>
          <h3 className={styles.cardHeaderTitle}>{config.title}</h3>
        </div>

        <div className={styles.cardBadgeSlot}>
          <span className={`${styles.cardCategoryPill} ${badgeToneClass}`}>
            {config.badgeIcon }
            <span>{config.badgeLabel ?? 'MATERIA'}</span>
          </span>
        </div>
      </div>

      <div className={styles.cardBodySurface}>
        <div className={styles.cardMainContent}>
          {config.headline && (
            <div className={styles.cardCodeHeadline}>
              {renderLabeledMeta(config.headline)}
            </div>
          )}

          {config.splitPosition !== 'afterMeta' && splitSectionNode}

          {config.primaryMeta && (
            <div className={styles.cardPrimaryMeta}>
              {renderLabeledMeta(config.primaryMeta)}
            </div>
          )}

          {config.secondaryMeta && (
            <div className={styles.cardPrimaryMeta}>
              {renderLabeledMeta(config.secondaryMeta)}
            </div>
          )}

          {config.splitPosition === 'afterMeta' && splitSectionNode}
        </div>

        {hasFooterSection && (
          <div className={styles.cardFooterBand}>
            {(config.footerMeta || config.footerExtra) && (
              <div className={styles.cardFooterMetaRow}>
                {config.footerMeta && (
                  <span className={styles.cardFooterText}>
                    {renderLabeledMeta(config.footerMeta)}
                  </span>
                )}
                {config.footerExtra && (
                  <div className={styles.cardFooterExtra}>
                    {config.footerExtra}
                  </div>
                )}
              </div>
            )}

            {hasAnyAction && (
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
            )}
          </div>
        )}
      </div>
    </article>
  )
}
