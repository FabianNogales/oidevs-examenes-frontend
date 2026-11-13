import type { ReactNode } from 'react'
import styles from './LayoutPrimitives.module.css'

export interface PageLayoutProps {
  /** Optional header slot (`<Header />` or custom navigation bar). */
  header?: ReactNode
  /** Optional sidebar slot (`<Sidebar />`) rendered alongside `<main>`. */
  sidebar?: ReactNode
  /** Main page content rendered inside `<main>`. */
  children: ReactNode
  /** Optional footer slot (`<Footer />`). */
  footer?: ReactNode
  /** Id of the `<main>` landmark for skip-links. */
  mainId?: string
  className?: string
}

/**
 * Global PageLayout template (`<header>` + optional `<Sidebar>` + `<main>{children}</main>` + `<footer>`).
 * Defines page structure and responsive column reorganization without hardcoding business content.
 */
export function PageLayout({
  header,
  sidebar,
  children,
  footer,
  mainId = 'main-content',
  className,
}: PageLayoutProps) {
  return (
    <div className={[styles.pageLayout, className].filter(Boolean).join(' ')}>
      {header}
      <div
        className={[
          styles.bodyArea,
          sidebar ? styles.bodyWithSidebar : null,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {sidebar}
        <main id={mainId} className={styles.mainArea} tabIndex={-1}>
          {children}
        </main>
      </div>
      {footer}
    </div>
  )
}

export type DashboardLayoutProps = PageLayoutProps

/**
 * Global DashboardLayout template: structural layout with header, collapsible sidebar slot,
 * `<main>` content area, and footer.
 */
export function DashboardLayout(props: DashboardLayoutProps) {
  return <PageLayout {...props} />
}

export interface AuthLayoutProps {
  /** Optional top bar or institutional header. */
  header?: ReactNode
  /** Left/informative column slot (brand, benefits, summary). */
  aside?: ReactNode
  /** Authentication form card slot. */
  children: ReactNode
  /** Optional footer slot. */
  footer?: ReactNode
  className?: string
}

/**
 * Global AuthLayout template: two-column authentication template (`aside` + form card)
 * that stacks into a single column on mobile viewports.
 */
export function AuthLayout({
  header,
  aside,
  children,
  footer,
  className,
}: AuthLayoutProps) {
  return (
    <div className={[styles.authLayout, className].filter(Boolean).join(' ')}>
      {header}
      <main className={styles.authMain}>
        <div
          className={[
            styles.authGrid,
            !aside ? styles.authSingleColumn : null,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {aside ? <aside className={styles.authAside}>{aside}</aside> : null}
          <section className={styles.authCardSlot}>{children}</section>
        </div>
      </main>
      {footer}
    </div>
  )
}
