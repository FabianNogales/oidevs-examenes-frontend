import type { HeaderNavigationItem, HeaderRole } from './header.types'

export const navigationByRole: Record<
  HeaderRole,
  readonly HeaderNavigationItem[]
> = {
  student: [
    { label: 'Inicio', to: '/', end: true },
    { label: 'Mis datos' },
    { label: 'Mis materias' },
    { label: 'Información' },
    { label: 'Servicios' },
  ],
  // Populate when teacher/admin routes are implemented.
  teacher: [],
  admin: [],
}
