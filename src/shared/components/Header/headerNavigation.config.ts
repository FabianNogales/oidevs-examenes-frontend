import type {
  HeaderNavigationItem,
  HeaderRole,
} from './header.types'

export const publicNavigation: readonly HeaderNavigationItem[] = [
  {
    label: 'Inicio',
    to: '/',
    end: true,
  },
  {
    label: 'Información',
  },
  {
    label: 'Servicios',
  },
]

export const navigationByRole: Record<
  HeaderRole,
  readonly HeaderNavigationItem[]
> = {
  teacher: [
    {
      label: 'Inicio',
      to: '/',
      end: true,
    },
    {
      label: 'Mis materias',
      to: '/teacher/subjects',
    },
    {
      label: 'Estudiantes',
      to: '/teacher/students',
    },
    {
      label: 'Mis exámenes',
    },
    {
      label: 'Información',
    },
    {
      label: 'Servicios',
    },
  ],

  student: [
    {
      label: 'Inicio',
      to: '/',
      end: true,
    },
    {
      label: 'Mis datos',
      to: '/students/profile',
    },
    {
      label: 'Mis exámenes',
      to: '/students/qr',
    },
    {
      label: 'Información',
    },
    {
      label: 'Servicios',
    },
  ],

  admin: [
    {
      label: 'Inicio',
      to: '/admin',
      end: true,
    },
    {
      label: 'Docentes',
      to: '/admin/teachers',
    },
    {
      label: 'Estudiantes',
      to: '/admin/students/import',
    },
    {
      label: 'Información',
    },
    {
      label: 'Servicios',
    },
  ],
}

export const roleLabelByRole: Record<HeaderRole, string> = {
  student: 'Estudiante',
  teacher: 'Docente',
  admin: 'Administrador',
}

export function getHeaderNavigation(
  role?: HeaderRole | null,
): readonly HeaderNavigationItem[] {
  if (!role) {
    return publicNavigation
  }

  return navigationByRole[role]
}
