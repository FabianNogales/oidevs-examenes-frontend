import type { AuthRole, AuthenticatedUser } from '@/features/auth/types/auth'

export const AUTH_ROUTES = Object.freeze({
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  changeInitialPassword: '/cambiar-contrasena-inicial',
  initialHistoricalPhoto: '/configuracion-inicial/fotografia',
  fallbackHome: '/home',
})

const ROLE_HOME_ROUTES: Record<AuthRole, string> = {
  ADMINISTRADOR: '/',
  DOCENTE: '/docente',
  ESTUDIANTE: '/',
}

const ROLE_PRIORITY: AuthRole[] = ['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE']

export function getHomeRouteForUser(user: AuthenticatedUser): string {
  if (user.must_change_password) return AUTH_ROUTES.changeInitialPassword
  if (user.must_upload_historical_photo)
    return AUTH_ROUTES.initialHistoricalPhoto
  const primaryRole = ROLE_PRIORITY.find((role) => user.roles.includes(role))

  return primaryRole ? ROLE_HOME_ROUTES[primaryRole] : '/'
}
