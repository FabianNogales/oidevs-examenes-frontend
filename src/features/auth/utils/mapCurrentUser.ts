import type {
  AuthRole,
  AuthUser,
  CurrentUserDto,
} from '../types/auth.types'

function mapRole(roles: string[]): AuthRole {
  if (roles.includes('DOCENTE')) {
    return 'teacher'
  }

  if (roles.includes('ESTUDIANTE')) {
    return 'student'
  }

  if (roles.includes('ADMINISTRADOR')) {
    return 'admin'
  }

  throw new Error(
    `Rol no soportado: ${roles.join(', ')}`,
  )
}

export function mapCurrentUser(
  user: CurrentUserDto,
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.display_name,

    role: mapRole(user.roles),

    mustChangePassword:
      user.must_change_password,
  }
}