import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { getDelegatedNavigation } from '@/features/roles/utils/delegatedNavigation'
import { CollaborationsProvider } from '@/features/collaborations/components/CollaborationsProvider'
import { useMyCollaborations } from '@/features/collaborations/hooks/useMyCollaborations'
import { getHeaderNavigation } from '@/shared/components/Header/headerNavigation.config'
import { Footer } from '@/shared/components/Footer/Footer'
import { Header } from '@/shared/components/Header/Header'
import { Snackbar } from '@/shared/components/Snackbar'

import type { AuthNotice, AuthRole } from '@/features/auth/types/auth'
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

interface NavigationState {
  accessDenied?: boolean
}

export function AppLayout() {
  return (
    <CollaborationsProvider>
      <AppLayoutContent />
    </CollaborationsProvider>
  )
}

function AppLayoutContent() {
  const navigate = useNavigate()
  const location = useLocation()

  const { logout, user, isLoading, isLoggingOut, notify } = useAuth()
  const { collaborations } = useMyCollaborations()
  const inCollaboratorContext =
    /^\/collaborator\/?$/.test(location.pathname) ||
    (/^\/exams\/[^/]+\/entry-control\/?$/.test(location.pathname) &&
      new URLSearchParams(location.search).get('from') === 'collaborator')

  const headerUser = useMemo<HeaderUser | null>(() => {
    if (!user) {
      return null
    }

    const primaryRole = ROLE_PRIORITY.find((role) => user.roles.includes(role))

    if (!primaryRole) {
      return { name: user.display_name, role: 'staff', roleLabel: user.roles.join(' · ') || 'Personal' }
    }

    return {
      name: user.display_name,
      role: HEADER_ROLE_BY_AUTH_ROLE[primaryRole],
      roleLabel: inCollaboratorContext ? 'Colaborador temporal' : undefined,
    }
  }, [user, inCollaboratorContext])

  const baseNavigation = getHeaderNavigation(
    headerUser?.role,
    collaborations.length > 0,
    ROLE_PRIORITY.filter((role) => user?.roles.includes(role))
      .map((role) => HEADER_ROLE_BY_AUTH_ROLE[role]),
  )
  const delegatedNavigation = getDelegatedNavigation(user)
  const navigation = [...baseNavigation, ...delegatedNavigation]

  const navigationState = location.state as NavigationState | null

  const notice: AuthNotice | null = navigationState?.accessDenied
    ? {
        id: 1,
        type: 'error',
        message:
          'Acceso restringido. No cuenta con permisos para acceder a esta sección.',
      }
    : null

  function dismissNotice() {
    navigate(location.pathname, {
      replace: true,
      state: null,
    })
  }

  async function handleLogout() {
    await logout()

    notify('success', 'Cerraste sesión correctamente.')

    navigate('/login', {
      replace: true,
    })
  }

  if (isLoading) {
    return null
  }

  return (
    <div className={styles.layout}>
      <Header
        user={headerUser}
        navigation={navigation}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <div className={styles.content}>
        <Outlet />
      </div>

      <Footer />

      <Snackbar notice={notice} onDismiss={dismissNotice} />
    </div>
  )
}
