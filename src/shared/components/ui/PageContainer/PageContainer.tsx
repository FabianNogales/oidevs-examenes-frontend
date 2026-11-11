import type { ReactNode } from 'react'
import styles from './PageContainer.module.css'

export type PageContainerWidth = 'default' | 'narrow'

export interface PageContainerProps {
  children: ReactNode
  /** default: --content-max-width (1280px); narrow: 960px for reading pages. */
  width?: PageContainerWidth
  className?: string
  /** id of the page heading; renders a labelled <section> instead of a <div>. */
  labelledBy?: string
}

// Page-level layout only: width, centring and padding. It never renders <main>,
// because the application layouts already provide that landmark.
export function PageContainer({ children, width = 'default', className, labelledBy }: PageContainerProps) {
  const classes = [styles.container, width === 'narrow' ? styles.narrow : null, className]
    .filter(Boolean)
    .join(' ')
  return labelledBy ? (
    <section className={classes} aria-labelledby={labelledBy}>
      {children}
    </section>
  ) : (
    <div className={classes}>{children}</div>
  )
}
