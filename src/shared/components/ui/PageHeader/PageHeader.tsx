import type { ReactNode } from 'react'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import type { BreadcrumbItem } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import styles from './PageHeader.module.css'

export interface PageHeaderProps {
  /** Text of the page's only <h1>. Must not be empty. */
  title: string
  titleId?: string
  /** Adds tabIndex={-1} so existing focus management can move focus to the heading. */
  focusableTitle?: boolean
  eyebrow?: string
  /** Inline content: it is rendered inside a <p>. */
  description?: ReactNode
  breadcrumbs?: readonly BreadcrumbItem[]
  /** Existing page actions, rendered as given. */
  actions?: ReactNode
}

export function PageHeader({
  title,
  titleId,
  focusableTitle = false,
  eyebrow,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  if (!title.trim()) throw new Error('PageHeader requires a non-empty title')
  return (
    <>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <header className={styles.header}>
        <div className={styles.text}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 id={titleId} tabIndex={focusableTitle ? -1 : undefined} className={styles.title}>
            {title}
          </h1>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
    </>
  )
}
