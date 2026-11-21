import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog/ConfirmDialog'
import { Avatar } from '@/shared/components/ui'

import { HeaderAccount } from './HeaderAccount'
import { HeaderLogo } from './HeaderLogo'
import { HeaderAcademicTermsLink } from './HeaderAcademicTermsLink'
import { HeaderNavigation } from './HeaderNavigation'
import { getHeaderNavigation, roleLabelByRole } from './headerNavigation.config'

import type { HeaderProps } from './header.types'

import styles from './Header.module.css'

export function Header({
  user,
  navigation,
  onLogout,
  isLoggingOut = false,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  const navigationId = useId()
  const menuButton = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const navigationRef = useRef<HTMLElement>(null)

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

  function requestLogout() {
    closeMenus()
    setLogoutError(null)
    setLogoutConfirmOpen(true)
  }

  function cancelLogout() {
    if (isLoggingOut) return
    setLogoutConfirmOpen(false)
    setLogoutError(null)
  }

  async function confirmLogout() {
    if (!onLogout || isLoggingOut) return
    setLogoutError(null)
    try {
      await onLogout()
    } catch {
      setLogoutError('No se pudo cerrar sesión. Intenta nuevamente.')
      return
    }
    setLogoutConfirmOpen(false)
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
          onLogoutRequest={onLogout ? requestLogout : undefined}
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
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      <nav
        ref={navigationRef}
        id={navigationId}
        aria-label="Navegación principal"
        className={styles.navigation}
        data-open={menuOpen}
      >
        {user ? (
          <div className={styles.mobileProfile}>
            <Avatar
              name={user.name}
              size="lg"
              className={styles.mobileProfileAvatar}
              aria-hidden="true"
            />
            <span className={styles.mobileProfileDetails}>
              <span className={styles.mobileProfileName}>{user.name}</span>
              <span className={styles.mobileProfileRole}>
                {user.roleLabel ?? roleLabelByRole[user.role]}
              </span>
            </span>
          </div>
        ) : null}
        <HeaderNavigation
          items={navigationItems}
          onNavigate={closeMenus}
        />
        {user && onLogout ? (
          <button
            type="button"
            className={styles.mobileLogout}
            disabled={isLoggingOut}
            onClick={requestLogout}
          >
            <LogOut aria-hidden="true" className={styles.navigationItemIcon} />
            <span className={styles.navigationLabel}>
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </span>
          </button>
        ) : null}
      </nav>

      <ConfirmDialog
        native
        isOpen={logoutConfirmOpen}
        title="¿Deseas cerrar sesión?"
        message={
          logoutError ??
          'Tu sesión actual se cerrará y tendrás que volver a iniciar sesión para acceder a tu cuenta.'
        }
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        variant="danger"
        loading={isLoggingOut}
        onConfirm={() => void confirmLogout()}
        onCancel={cancelLogout}
      />
    </header>
  )
}
