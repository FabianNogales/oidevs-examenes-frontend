import { useId, useRef, useState } from 'react'

import { HeaderAccount } from './HeaderAccount'
import { HeaderLogo } from './HeaderLogo'
import { HeaderNavigation } from './HeaderNavigation'
import { getHeaderNavigation } from './headerNavigation.config'

import type { HeaderProps } from './header.types'

import styles from './Header.module.css'

export function Header({
  user,
  navigation,
  notifications,
  onLogout,
  isLoggingOut = false,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navigationId = useId()
  const menuButton = useRef<HTMLButtonElement>(null)

  // Si alguien pasa navigation manualmente, la usamos.
  // Si no, elegimos automáticamente según el rol.
  const navigationItems =
    navigation ?? getHeaderNavigation(user?.role)

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
        <HeaderLogo onNavigate={closeMenu} />

        <HeaderAccount
          user={user}
          notifications={notifications}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
        />

        <button
          ref={menuButton}
          type="button"
          className={`${styles.iconButton} ${styles.menuButton}`}
          aria-expanded={menuOpen}
          aria-controls={navigationId}
          aria-label={
            menuOpen
              ? 'Cerrar menú principal'
              : 'Abrir menú principal'
          }
          onClick={() => {
            setMenuOpen((open) => !open)
          }}
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
              d={
                menuOpen
                  ? 'M6 6l12 12M6 18 18 6'
                  : 'M4 6h16M4 12h16M4 18h16'
              }
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
        <HeaderNavigation
          items={navigationItems}
          onNavigate={closeMenu}
        />
      </nav>
    </header>
  )
}