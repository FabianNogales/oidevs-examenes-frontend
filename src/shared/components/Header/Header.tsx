import { useId, useRef, useState } from 'react'
import { NavLink } from 'react-router'
import umssLogo from '@/assets/images/umss-logo.svg'
import type { HeaderProps } from './header.types'
import styles from './Header.module.css'

export function Header({ navigation, user, notifications }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigationId = useId()
  const menuButton = useRef<HTMLButtonElement>(null)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header
      className={styles.header}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          closeMenu()
          menuButton.current?.focus()
        }
      }}
    >
      <div className={styles.topBar}>
        <img
          src={umssLogo}
          alt="Universidad Mayor de San Simón"
          width={864}
          height={1328}
          className={styles.logo}
        />

        <div className={styles.account}>
          <div className={styles.notifications}>
            {notifications ?? (
              <button
                type="button"
                className={styles.iconButton}
                disabled
                aria-label="Notificaciones no disponibles"
                title="Notificaciones no disponibles"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
                  <path d="M10 21h4" />
                </svg>
              </button>
            )}
          </div>
          <div className={styles.user}>
            <span className={styles.avatar} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                focusable="false"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
              </svg>
            </span>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{user.roleLabel}</span>
            </div>
          </div>
        </div>

        <button
          ref={menuButton}
          type="button"
          className={`${styles.iconButton} ${styles.menuButton}`}
          aria-expanded={menuOpen}
          aria-controls={navigationId}
          aria-label={
            menuOpen ? 'Cerrar menú principal' : 'Abrir menú principal'
          }
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d={menuOpen ? 'M6 6l12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </div>

      <nav
        id={navigationId}
        aria-label="Navegación principal"
        className={styles.navigation}
        data-open={menuOpen}
      >
        <ul className={styles.navigationList}>
          {navigation.map((item) => (
            <li key={item.label}>
              {item.to ? (
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `${styles.navigationLink} ${isActive ? styles.active : ''}`
                  }
                  onClick={closeMenu}
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
                  <span className={styles.srOnly}> (próximamente)</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
