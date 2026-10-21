import { useMemo } from 'react'
import { useLocation } from 'react-router'
import type {
  RouteAccessContext,
  RouteAccessRole,
  RouteModuleScope,
} from './dataCardGrid.types'

/**
 * Detecta la ruta activa para aislar qué acciones puede ver o ejecutar cada rol
 * sin acoplar el componente de tarjetas a un módulo específico.
 */
export function useRouteAccessContext(
  forcedScope?: RouteModuleScope,
): RouteAccessContext {
  const { pathname } = useLocation()

  return useMemo(() => {
    const normalizedPath = pathname.toLowerCase()

    let moduleScope: RouteModuleScope = 'general'
    let accessRole: RouteAccessRole = 'GENERAL'

    if (normalizedPath.startsWith('/admin/users')) {
      moduleScope = 'admin-users'
      accessRole = 'ADMIN'
    } else if (normalizedPath.startsWith('/admin/students')) {
      moduleScope = 'admin-students'
      accessRole = 'ADMIN'
    } else if (normalizedPath.startsWith('/admin/teachers')) {
      moduleScope = 'admin-teachers'
      accessRole = 'ADMIN'
    } else if (normalizedPath.startsWith('/admin')) {
      moduleScope = 'admin-general'
      accessRole = 'ADMIN'
    } else if (normalizedPath.startsWith('/teacher')) {
      moduleScope = 'teacher-portal'
      accessRole = 'TEACHER'
    } else if (normalizedPath.startsWith('/student')) {
      moduleScope = 'student-portal'
      accessRole = 'STUDENT'
    }

    const effectiveScope = forcedScope ?? moduleScope

    return {
      pathname,
      accessRole,
      moduleScope: effectiveScope,
      isAdminUsersRoute: effectiveScope === 'admin-users',
      isAdminStudentsRoute: effectiveScope === 'admin-students',
      isAdminTeachersRoute: effectiveScope === 'admin-teachers',
      isTeacherRoute: effectiveScope === 'teacher-portal',
      isStudentRoute: effectiveScope === 'student-portal',
    }
  }, [pathname, forcedScope])
}