import type { ReactNode, Ref } from 'react'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import type { BreadcrumbItem } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import styles from './PageHeader.module.css'

export interface PageHeaderProps {
  /** Main heading text rendered inside <h2> (alias of subtitle). */
  title?: string
  /** Main heading text rendered inside <h2> (--type-h2). */
  subtitle?: string
  titleId?: string
  titleRef?: Ref<HTMLHeadingElement>
  /** Adds tabIndex={-1} so existing focus management can move focus to the heading. */
  focusableTitle?: boolean
  eyebrow?: string
  /** Secondary text rendered inside <p> (--type-body). */
  description?: ReactNode
  /** Alias for description (secondary text). */
  secondaryText?: ReactNode
  breadcrumbs?: readonly BreadcrumbItem[]
  /** Existing page actions, rendered as given. */
  actions?: ReactNode
}

export function PageHeader({
  title,
  subtitle,
  titleId,
  titleRef,
  focusableTitle = false,
  eyebrow,
  description,
  secondaryText,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  const headingText = subtitle ?? title ?? ''
  if (!headingText.trim()) throw new Error('PageHeader requires a non-empty title')
  const secondary = secondaryText ?? description
  return (
    <>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <header className={styles.header}>
        <div className={styles.text}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2 ref={titleRef} id={titleId} tabIndex={focusableTitle ? -1 : undefined} className={styles.title}>
            {headingText}
          </h2>
          {secondary ? <p className={styles.description}>{secondary}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
    </>
  )
}
