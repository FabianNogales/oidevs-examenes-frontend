import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useControllableState } from '@/shared/hooks/useControllableState'
import styles from './Sidebar.module.css'

export interface SidebarNavItem {
  /** Unique identifier of the navigation item. */
  id: string
  /** Visible navigation label. */
  label: string
  /** Route destination (`to`). */
  to: string
  /** Optional leading icon. */
  icon?: ReactNode
  /** Match exact pathname instead of prefix matching. */
  exact?: boolean
  /** Optional badge text. */
  badge?: string
}

export interface SidebarProps {
  /** Navigation items rendered in the sidebar. */
  items: readonly SidebarNavItem[]
  /** Optional header slot (e.g., brand or section title). */
  header?: ReactNode
  /** Optional footer slot (e.g., user summary or version). */
  footer?: ReactNode
  /** Controlled collapsed state. */
  collapsed?: boolean
  /** Initial collapsed state when uncontrolled. */
  defaultCollapsed?: boolean
  /** Callback fired when collapsed state changes. */
  onCollapsedChange?: (collapsed: boolean) => void
  /** Explicit current pathname override (defaults to `useLocation().pathname`). */
  activePath?: string
  /** Accessible label for the `<aside>` navigation landmark. */
  ariaLabel?: string
  className?: string
}

export function isSidebarItemActive(
  item: SidebarNavItem,
  currentPath: string,
): boolean {
  if (item.exact || item.to === '/') {
    return currentPath === item.to
  }
  return (
    currentPath === item.to ||
    currentPath.startsWith(item.to.endsWith('/') ? item.to : `${item.to}/`)
  )
}

/**
 * Global Sidebar organism: collapsible navigation panel with route-aware active state
 * (`aria-current="page"`) and slot-based `header` / `footer` areas.
 */
export function Sidebar({
  items,
  header,
  footer,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  activePath,
  ariaLabel = 'Menú lateral',
  className,
}: SidebarProps) {
  const location = useLocation()
  const currentPath = activePath ?? location.pathname

  const [collapsed, setCollapsed] = useControllableState<boolean>({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
  })

  return (
    <aside
      aria-label={ariaLabel}
      data-collapsed={collapsed ? 'true' : 'false'}
      className={[
        styles.sidebar,
        collapsed ? styles.collapsed : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.topBar}>
        {!collapsed && header ? (
          <div className={styles.headerSlot}>{header}</div>
        ) : null}
        <button
          type="button"
          data-ds-button=""
          className={styles.collapseButton}
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'
          }
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
        </button>
      </div>

      <nav aria-label={ariaLabel} className={styles.nav}>
        <ul className={styles.navList}>
          {items.map((item) => {
            const active = isSidebarItemActive(item, currentPath)
            return (
              <li key={item.id}>
                <Link
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={[
                    styles.navLink,
                    active ? styles.navLinkActive : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {item.icon ? (
                    <span className={styles.icon} aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  {!collapsed ? (
                    <span className={styles.label}>{item.label}</span>
                  ) : null}
                  {!collapsed && item.badge ? (
                    <span className={styles.badge}>{item.badge}</span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {!collapsed && footer ? (
        <div className={styles.footerSlot}>{footer}</div>
      ) : null}
    </aside>
  )
}
