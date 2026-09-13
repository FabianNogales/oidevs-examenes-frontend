import type { CurrentUserDto } from '@/features/auth/types/auth.types'

export const mockCurrentUserDto: CurrentUserDto = {
  id: 999,
  display_name: 'Docente de Prueba',
  email: 'docente.prueba@umss.edu',
  status: 'active',
  must_change_password: false,
  roles: ['DOCENTE'],
}

export function getMockCurrentUser(): CurrentUserDto {
  return {
    ...mockCurrentUserDto,
  }
}
