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
      children: [
        {
          label: 'Próximos y en curso',
          to: '/teacher/exams?view=upcoming',
          defaultSearchParams: { view: 'upcoming' },
        },
        { label: 'Exámenes anteriores', to: '/teacher/exams?view=past' },
        { label: 'Exámenes cancelados', to: '/teacher/exams?view=cancelled' },
        { label: 'Todos los exámenes', to: '/teacher/exams?view=all' },
      ],
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
      label: 'Usuarios',
      children: [
        { label: 'Gestionar usuarios', to: '/admin/users/manage' },
        { label: 'Historial de cambios', to: '/admin/users/history' },
      ],
    },
    {
      label: 'Docentes',
      children: [
        { label: 'Gestionar docentes', to: '/admin/teachers' },
        { label: 'Asignación de materias', to: '/admin/teachers/assignments' },
        {
          label: 'Importar asignaciones',
          to: '/admin/teachers/assignments/import',
        },
      ],
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
      children: [
        { label: 'Gestionar aulas', to: '/admin/rooms' },
        { label: 'Importar aulas', to: '/admin/rooms/import' },
      ],
    },
    {
      label: 'Materias',
      children: [
        { label: 'Gestionar materias', to: '/admin/subjects' },
        { label: 'Importar materias', to: '/admin/subjects/import' },
      ],
    },
    { label: 'Carreras', to: '/admin/careers' },
    { label: 'Auditoría', to: '/admin/audit-logs' },
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
