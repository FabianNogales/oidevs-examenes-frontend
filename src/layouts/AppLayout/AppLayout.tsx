import { useMemo, useState } from 'react'
import { useNavigate, Outlet } from 'react-router'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Header } from '@/shared/components/Header/Header'
import type { AuthRole } from '@/features/auth/types/auth'
import type {
  HeaderRole,
  HeaderUser,
} from '@/shared/components/Header/header.types'

const HEADER_ROLE_BY_AUTH_ROLE: Record<AuthRole, HeaderRole> = {
  ADMINISTRADOR: 'admin',
  DOCENTE: 'teacher',
  ESTUDIANTE: 'student',
}

const ROLE_PRIORITY: AuthRole[] = ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE']

export function AppLayout() {
  const navigate = useNavigate()
  const { logout, user, isLoading } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
    setIsLoggingOut(true)

    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <>
      <Header
        user={headerUser}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <Outlet />
    </>
  )
}
