import { NavLink } from 'react-router'

import type { HeaderNavigationProps } from './header.types'

import styles from './Header.module.css'

export function HeaderNavigation({
  items,
  onNavigate,
}: HeaderNavigationProps) {
  return (
    <ul className={styles.navigationList}>
      {items.map((item) => (
        <li key={`${item.label}-${item.to ?? 'unavailable'}`}>
          {item.to ? (
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${styles.navigationLink} ${
                  isActive ? styles.active : ''
                }`
              }
              onClick={onNavigate}
            >
              {item.label}
            </NavLink>
          ) : (
            <span
              className={`${styles.navigationLink} ${styles.unavailable}`}
              role="link"
              aria-disabled="true"
              title="Próximamente"
            >
              {item.label}

              <span className={styles.srOnly}>
                {' '}
                (próximamente)
              </span>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}