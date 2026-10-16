import type { HeaderNavigationItem, HeaderRole } from './header.types'

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
      to: '/teacher/exams',
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
      to: '/',
      end: true,
    },
    {
      label: 'Docentes',
      to: '/admin/teachers',
    },
    {
      label: 'Estudiantes',
      children: [
        { label: 'Gestionar estudiantes', to: '/admin/students/manage' },
        { label: 'Importar estudiantes', to: '/admin/students/import' },
      ],
    },
    {
      label: 'Aulas',
      to: '/admin/rooms',
    },
    {
      label: 'Materias',
      to: '/admin/subjects',
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
  hasCollaborations = false,
): readonly HeaderNavigationItem[] {
  const navigation = role ? navigationByRole[role] : publicNavigation
  if (!hasCollaborations) return navigation
  const insertionIndex = navigation.findIndex(
    (item) => item.label === 'Información',
  )
  const index = insertionIndex < 0 ? navigation.length : insertionIndex
  return [
    ...navigation.slice(0, index),
    { label: 'Colaborador', to: '/collaborator' },
    ...navigation.slice(index),
  ]
}
