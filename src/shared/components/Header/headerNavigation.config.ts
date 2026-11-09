import type { HeaderNavigationItem, HeaderRole } from './header.types'

export const publicNavigation: readonly HeaderNavigationItem[] = [
  {
    label: 'Inicio',
    to: '/',
    end: true,
  },
  { label: 'Noticias', to: '/news' },
  {
    label: 'Información',
    to: '/information',
  },
  {
    label: 'Servicios',
    to: '/services',
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
    { label: 'Noticias', to: '/news' },
    {
      label: 'Mis materias',
      to: '/teacher/subjects',
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
        { label: 'Reportes de exámenes', to: '/teacher/exam-reports' },
      ],
    },
    {
      label: 'Información',
      to: '/information',
    },
    {
      label: 'Servicios',
      to: '/services',
    },
  ],

  student: [
    {
      label: 'Inicio',
      to: '/',
      end: true,
    },
    { label: 'Noticias', to: '/news' },
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
      to: '/information',
    },
    {
      label: 'Servicios',
      to: '/services',
    },
  ],

  admin: [
    {
      label: 'Inicio',
      to: '/',
      end: true,
    },
    {
      label: 'Contenidos',
      children: [
        { label: 'Noticias', to: '/news' },
        { label: 'Gestionar noticias', to: '/admin/portal/news' },
        { label: 'Gestionar calendario', to: '/admin/portal/events' },
        { label: 'Gestionar información', to: '/admin/portal/information' },
        { label: 'Gestionar servicios', to: '/admin/portal/services' },
      ],
    },
    {
      label: 'Usuarios',
      activePrefixes: ['/admin/users', '/admin/teachers', '/admin/students'],
      children: [
        { label: 'Usuarios', to: '/admin/users/manage' },
        { label: 'Roles y permisos', to: '/admin/users/roles' },
        { label: 'Historial de cambios', to: '/admin/users/history' },
        { label: 'Docentes', to: '/admin/teachers', startsSection: true },
        { label: 'Asignación de materias', to: '/admin/teachers/assignments' },
        {
          label: 'Importar asignaciones',
          to: '/admin/teachers/assignments/import',
        },
        {
          label: 'Estudiantes',
          to: '/admin/students/manage',
          startsSection: true,
        },
        { label: 'Importar estudiantes', to: '/admin/students/import' },
      ],
    },
    {
      label: 'Académico',
      children: [
        { label: 'Aulas', to: '/admin/rooms' },
        { label: 'Importar aulas', to: '/admin/rooms/import' },
        { label: 'Materias', to: '/admin/subjects', startsSection: true },
        { label: 'Importar materias', to: '/admin/subjects/import' },
        { label: 'Carreras', to: '/admin/careers', startsSection: true },
        {
          label: 'Criterios de habilitación',
          to: '/admin/eligibility-policies',
        },
        {
          label: 'Incidencias e ingresos irregulares',
          to: '/admin/incidents',
          startsSection: true,
        },
        { label: 'Reportes de exámenes', to: '/admin/exam-reports' },
      ],
    },
    { label: 'Auditoría', to: '/admin/audit-logs' },
    {
      label: 'Información',
      to: '/information',
    },
    {
      label: 'Servicios',
      to: '/services',
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
  additionalRoles: readonly HeaderRole[] = [],
): readonly HeaderNavigationItem[] {
  const seen = new Set<string>()
  const roles = role ? [...new Set([role, ...additionalRoles])] : []
  const entries = role
    ? roles
        .flatMap((itemRole) =>
          navigationByRole[itemRole].map((item) => ({
            ...item,
            label:
              roles.length > 1 && item.to === '/teacher/students'
                ? 'Estudiantes de mis materias'
                : roles.length > 1 && item.to === '/students/qr'
                  ? 'Mis exámenes como estudiante'
                  : item.label,
          })),
        )
        .filter((item) => {
          const key = item.to ?? item.label
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
    : publicNavigation
  // Administrator links may already live inside the grouped navigation, e.g. /news.
  const destinations = new Set<string>()
  const adminEntries =
    role === 'admin'
      ? entries.filter((item) => {
          if (item.to) {
            if (destinations.has(item.to)) return false
            destinations.add(item.to)
          }
          item.children?.forEach((child) => {
            if (child.to) destinations.add(child.to)
          })
          return true
        })
      : entries
  const navigation = [
    ...adminEntries.filter(
      (item) => !['Información', 'Servicios'].includes(item.label),
    ),
    ...adminEntries.filter((item) =>
      ['Información', 'Servicios'].includes(item.label),
    ),
  ]
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
