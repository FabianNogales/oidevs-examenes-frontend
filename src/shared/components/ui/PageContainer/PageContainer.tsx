import type { ReactNode, Ref } from 'react'
import type { BreadcrumbItem } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import styles from './PageContainer.module.css'

export type PageContainerWidth = 'default' | 'narrow'

export interface PageContainerProps {
  children: ReactNode
  /** Uniform 1300px max-width across all pages (--content-max-width). */
  width?: PageContainerWidth
  className?: string
  /** id of the page heading; renders a labelled <section> instead of a <div>. */
  labelledBy?: string
  /** Optional header props when using PageContainer directly as the universal header+container. */
  breadcrumbs?: readonly BreadcrumbItem[]
  subtitle?: string
  title?: string
  description?: ReactNode
  secondaryText?: ReactNode
  eyebrow?: string
  actions?: ReactNode
  titleId?: string
  titleRef?: Ref<HTMLHeadingElement>
  focusableTitle?: boolean
}

// Page-level layout only: width (1300px), centring and padding. It never renders <main>,
// because the application layouts already provide that landmark.
export function PageContainer({
  children,
  width = 'default',
  className,
  labelledBy,
  breadcrumbs,
  subtitle,
  title,
  description,
  secondaryText,
  eyebrow,
  actions,
  titleId,
  titleRef,
  focusableTitle,
}: PageContainerProps) {
  const classes = [styles.container, width === 'narrow' ? styles.narrow : null, className]
    .filter(Boolean)
    .join(' ')
  const hasHeader = Boolean(subtitle || title)
  const effectiveLabelledBy = labelledBy ?? (hasHeader ? titleId : undefined)
  const content = hasHeader ? (
    <>
      <PageHeader
        subtitle={subtitle}
        title={title}
        titleId={effectiveLabelledBy}
        titleRef={titleRef}
        focusableTitle={focusableTitle}
        eyebrow={eyebrow}
        description={description}
        secondaryText={secondaryText}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />
      {children}
    </>
  ) : (
    children
  )
  return effectiveLabelledBy ? (
    <section className={classes} aria-labelledby={effectiveLabelledBy}>
      {content}
    </section>
  ) : (
    <div className={classes}>{content}</div>
  )
}
