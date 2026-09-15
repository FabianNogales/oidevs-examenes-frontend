import type { AuthenticatedUser } from '@/features/auth/types/auth'

export const mockCurrentUserDto: AuthenticatedUser = {
  id: 999,
  display_name: 'Docente de Prueba',
  email: 'docente.prueba@umss.edu',
  status: 'active',
  must_change_password: false,
  roles: ['DOCENTE'],
}

export function getMockCurrentUser(): AuthenticatedUser {
  return {
    ...mockCurrentUserDto,
  }
}
