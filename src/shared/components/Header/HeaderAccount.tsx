import { useRef } from 'react'
import { NavLink } from 'react-router'
import { ChevronDown, LogOut } from 'lucide-react'
import { Avatar, Button, Card } from '@/shared/components/ui'
import { roleLabelByRole } from './headerNavigation.config'
import type { HeaderAccountProps } from './header.types'
import styles from './Header.module.css'

export function HeaderAccount({
  user,
  onLogoutRequest,
  isLoggingOut = false,
  accountOpen = false,
  onAccountOpenChange,
}: HeaderAccountProps) {
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

  function requestLogout() {
    closeAccount()
    onLogoutRequest?.()
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
      <div className={styles.accountMenu}>
        <button
          ref={accountButton}
          type="button"
          className={styles.userButton}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
          onClick={toggleAccount}
        >
          <Avatar
            name={user.name}
            size="md"
            className={styles.avatar}
            aria-hidden="true"
          />

          <span className={styles.userDetails}>
            <span className={styles.userName}>{user.name}</span>
            {/* Texto de rol muteado */}
            <span className={styles.userRole}>{roleLabel}</span>
          </span>

          <ChevronDown
            className={`${styles.chevron} ${accountOpen ? styles.chevronOpen : ''}`}
            aria-hidden="true"
          />
        </button>

        {accountOpen && (
          <Card padding="sm" className={styles.accountDropdown} role="menu">
            <div className={styles.accountSummary}>
              <strong>{user.name}</strong>
              <span>{roleLabel}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              role="menuitem"
              className={styles.logoutButton}
              disabled={!onLogoutRequest || isLoggingOut}
              onClick={requestLogout}
            >
              <LogOut aria-hidden="true" className={styles.logoutIcon} />
              <span>{isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
