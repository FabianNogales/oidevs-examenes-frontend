import { useRef, useState } from 'react'
import { NavLink } from 'react-router'
import { roleLabelByRole } from './headerNavigation.config'
import type { HeaderAccountProps } from './header.types'
import styles from './Header.module.css'

export function HeaderAccount({
  user,
  notifications,
  onLogout,
  isLoggingOut = false,
  accountOpen = false,
  onAccountOpenChange,
}: HeaderAccountProps) {
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const accountButton = useRef<HTMLButtonElement>(null)

  if (!user) {
    return (
      <NavLink to="/login" className={styles.loginButton}>
        Iniciar sesión
      </NavLink>
    )
  }

  const roleLabel = user.roleLabel ?? roleLabelByRole[user.role]

  function closeAccount() {
    onAccountOpenChange?.(false)
  }

  function toggleAccount() {
    onAccountOpenChange?.(!accountOpen)
  }

  async function handleLogout() {
    if (!onLogout || isLoggingOut) return
    setLogoutError(null)
    try {
      await onLogout()
    } catch {
      setLogoutError('No se pudo cerrar sesión. Intenta nuevamente.')
      return
    }
    closeAccount()
  }

  return (
    <div
      className={styles.account}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && accountOpen) {
          closeAccount()
          accountButton.current?.focus()
        }
      }}
    >
      <div className={styles.notifications}>
        <HeaderNotifications notifications={notifications} />
      </div>

      <div className={styles.accountMenu}>
        <button
          ref={accountButton}
          type="button"
          className={styles.userButton}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          onClick={toggleAccount}
        >
          <span className={styles.avatar} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#172554"
              strokeWidth="1.5"
              focusable="false"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
            </svg>
          </span>

          <span className={styles.userDetails}>
            <span className={styles.userName} style={{ fontWeight: 600 }}>{user.name}</span>
            {/* Texto de rol muteado */}
            <span className={styles.userRole} style={{ color: '#68778F' }}>{roleLabel}</span>
          </span>

          <svg
            className={styles.chevron}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7A7E86"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d={accountOpen ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
          </svg>
        </button>

        {accountOpen && (
          <div className={`${styles.accountDropdown} flat2-card`} role="menu">
            <div className={styles.accountSummary}>
              <strong>{user.name}</strong>
              <span>{roleLabel}</span>
            </div>
            {logoutError && (
              <p className={styles.logoutError} role="alert">
                {logoutError}
              </p>
            )}
            <button
              type="button"
              role="menuitem"
              className={styles.logoutButton}
              disabled={!onLogout || isLoggingOut}
              onClick={() => void handleLogout()}
            >
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
export function HeaderNotifications({ notifications }: Pick<HeaderAccountProps, 'notifications'>) {
  return (
    <>
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
              stroke="#172554"
              strokeWidth="1.5"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
              <path d="M10 21h4" />
            </svg>
          </button>
        )}
    </>
  )
}
