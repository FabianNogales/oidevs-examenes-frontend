import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import { HeaderAccount, HeaderNotifications } from './HeaderAccount'
import { HeaderLogo } from './HeaderLogo'
import { HeaderAcademicTermsLink } from './HeaderAcademicTermsLink'
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
  const [accountOpen, setAccountOpen] = useState(false)

  const navigationId = useId()
  const menuButton = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const [smallScreen, setSmallScreen] = useState(() => window.matchMedia('(max-width: 479px)').matches)

  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return

    const rootStyle = document.documentElement.style
    const previousHeight = rootStyle.getPropertyValue('--app-header-height')
    const previousPriority = rootStyle.getPropertyPriority('--app-header-height')
    const updateHeight = () => {
      rootStyle.setProperty('--app-header-height', `${header.getBoundingClientRect().height}px`)
    }
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(header)

    return () => {
      observer.disconnect()
      if (previousHeight) {
        rootStyle.setProperty('--app-header-height', previousHeight, previousPriority)
      } else {
        rootStyle.removeProperty('--app-header-height')
      }
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 479px)')
    const update = () => setSmallScreen(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!menuOpen && !accountOpen) return
    const handleOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return
      if (menuOpen && !navigationRef.current?.contains(event.target) && !menuButton.current?.contains(event.target)) {
        setMenuOpen(false)
      }
      if (!headerRef.current?.contains(event.target)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [menuOpen, accountOpen])

  // Si alguien pasa navigation manualmente, la usamos.
  // Si no, elegimos automáticamente según el rol.
  const navigationItems =
    navigation ?? getHeaderNavigation(user?.role)

  function closeMenu() {
    setMenuOpen(false)
  }

  function closeAccount() {
    setAccountOpen(false)
  }

  function closeMenus() {
    closeMenu()
    closeAccount()
  }

  function toggleMenu() {
    setMenuOpen((open) => {
      const nextOpen = !open

      if (nextOpen) {
        closeAccount()
      }

      return nextOpen
    })
  }

  function handleAccountOpenChange(open: boolean) {
    if (open) {
      closeMenu()
    }

    setAccountOpen(open)
  }

  return (
    <header
      ref={headerRef}
      className={styles.header}
      data-admin={user?.role === 'admin' || undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          closeMenu()
          menuButton.current?.focus()
        }
      }}
    >
      <div className={styles.topBar}>
        <HeaderLogo onNavigate={closeMenus} />

        {user?.role === 'admin' && <HeaderAcademicTermsLink onNavigate={closeMenus} />}

        <HeaderAccount
          user={user}
          notifications={smallScreen ? <></> : notifications}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
          accountOpen={accountOpen}
          onAccountOpenChange={handleAccountOpenChange}
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
          onClick={toggleMenu}
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
        ref={navigationRef}
        id={navigationId}
        aria-label="Navegación principal"
        className={styles.navigation}
        data-open={menuOpen}
      >
        <HeaderNavigation
          items={navigationItems}
          onNavigate={closeMenus}
        />
        {smallScreen && user ? (
          <div className={styles.mobileNotifications}>
            <span>Notificaciones</span>
            <HeaderNotifications notifications={notifications} />
          </div>
        ) : null}
      </nav>
    </header>
  )
}
