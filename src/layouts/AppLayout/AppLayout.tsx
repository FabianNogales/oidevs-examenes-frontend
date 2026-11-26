import { useMemo } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { getHomeRouteForUser } from '@/features/auth/utils/authRoutes'
import { getDelegatedRoleLabel, withDelegatedNavigation } from '@/features/roles/utils/delegatedNavigation'
import { CollaborationsProvider } from '@/features/collaborations/components/CollaborationsProvider'
import { useMyCollaborations } from '@/features/collaborations/hooks/useMyCollaborations'
import {
  getAccountRoleLabels,
  getHeaderNavigation,
} from '@/shared/components/Header/headerNavigation.config'
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
    const delegatedRoleLabel = getDelegatedRoleLabel(user, location.pathname)

    if (!primaryRole) {
      // Solo roles personalizados: se muestra el primero real de la cuenta, sin inventar un rol base.
      return {
        name: user.display_name,
        role: 'staff',
        roleLabel: delegatedRoleLabel ?? getAccountRoleLabels(user.roles)[0] ?? 'Personal',
      }
    }

    return {
      name: user.display_name,
      role: HEADER_ROLE_BY_AUTH_ROLE[primaryRole],
      roleLabel: inCollaboratorContext ? 'Colaborador temporal' : delegatedRoleLabel,
    }
  }, [user, inCollaboratorContext, location.pathname])

  const baseNavigation = getHeaderNavigation(
    headerUser?.role,
    collaborations.length > 0,
    ROLE_PRIORITY.filter((role) => user?.roles.includes(role))
      .map((role) => HEADER_ROLE_BY_AUTH_ROLE[role]),
  )
  const navigation = withDelegatedNavigation(baseNavigation, user)

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

  if (user?.must_upload_historical_photo) {
    return <Navigate to={getHomeRouteForUser(user)} replace />
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
