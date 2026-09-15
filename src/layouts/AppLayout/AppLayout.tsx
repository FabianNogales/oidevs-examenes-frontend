import { useMemo } from 'react'
import { useNavigate, Outlet } from 'react-router'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Header } from '@/shared/components/Header/Header'
import { Footer } from '@/shared/components/Footer/Footer'
import type { AuthRole } from '@/features/auth/types/auth'
import type {
  HeaderRole,
  HeaderUser,
} from '@/shared/components/Header/header.types'
import styles from './AppLayout.module.css'

const HEADER_ROLE_BY_AUTH_ROLE: Record<AuthRole, HeaderRole> = {
  ADMINISTRADOR: 'admin',
  DOCENTE: 'teacher',
  ESTUDIANTE: 'student',
}

const ROLE_PRIORITY: AuthRole[] = ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE']

export function AppLayout() {
  const navigate = useNavigate()
  const {
    logout,
    user,
    isLoading,
    isLoggingOut,
  } = useAuth()

  const headerUser = useMemo<HeaderUser | null>(() => {
    if (!user) {
      return null
    }

    const primaryRole = ROLE_PRIORITY.find((role) => user.roles.includes(role))

    if (!primaryRole) {
      return null
    }

    return {
      name: user.display_name,
      role: HEADER_ROLE_BY_AUTH_ROLE[primaryRole],
    }
  }, [user])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  if (isLoading) {
    return null
  }

  return (
    <div className={styles.layout}>
      <Header
        user={headerUser}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <div className={styles.content}>
        <Outlet />
      </div>

      <Footer />
    </div>
  )
}
