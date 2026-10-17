import type {
  EntityRole,
  ProfileModuleContext,
  ProfileTabConfig,
} from '../types/entityProfile.types'

import { ProfileOverviewTab } from '../tabs/ProfileOverviewTab'
import { ProfileEditTab } from '../tabs/ProfileEditTab'
import { StudentCurrentSubjectsTab } from '../tabs/StudentCurrentSubjectsTab'
import { StudentSubjectHistoryTab } from '../tabs/StudentSubjectHistoryTab'
import { TeacherActiveSubjectsTab } from '../tabs/TeacherActiveSubjectsTab'
import { TeacherSubjectHistoryTab } from '../tabs/TeacherSubjectHistoryTab'
import { TeacherActiveExamsTab } from '../tabs/TeacherActiveExamsTab'
import { TeacherExamHistoryTab } from '../tabs/TeacherExamHistoryTab'
import { CollaboratorRoleTab } from '../tabs/CollaboratorRoleTab'
import { RoleHistoryTab } from '../tabs/RoleHistoryTab'

/** Pestañas base compartidas por todos los roles */
const BASE_TABS: readonly ProfileTabConfig[] = [
  {
    id: 'perfil',
    label: 'Perfil',
    icon: 'user',
    render: (props) => <ProfileOverviewTab {...props} />,
  },
  {
    id: 'editar',
    label: 'Editar datos',
    icon: 'edit',
    render: (props) => <ProfileEditTab {...props} />,
  },
]

/** Pestañas finales de roles compartidas */
const ROLE_MANAGEMENT_TABS: readonly ProfileTabConfig[] = [
  {
    id: 'rol-colaborador',
    label: 'Rol colaborador',
    icon: 'collaborator',
    render: (props) => <CollaboratorRoleTab {...props} />,
  },
  {
    id: 'historial-roles',
    label: 'Historial de roles',
    icon: 'role-history',
    render: (props) => <RoleHistoryTab {...props} />,
  },
]

/** 1. Configuración para ESTUDIANTE */
const STUDENT_TABS: readonly ProfileTabConfig[] = [
  ...BASE_TABS,
  {
    id: 'materias-actuales',
    label: 'Materias actuales',
    icon: 'book',
    render: (props) => <StudentCurrentSubjectsTab {...props} />,
  },
  {
    id: 'historial-materias',
    label: 'Historial de materias',
    icon: 'history',
    render: (props) => <StudentSubjectHistoryTab {...props} />,
  },
  ...ROLE_MANAGEMENT_TABS,
]

/** 2. Configuración para DOCENTE */
const TEACHER_TABS: readonly ProfileTabConfig[] = [
  ...BASE_TABS,
  {
    id: 'materias-dicta',
    label: 'Materias que dicta',
    icon: 'book',
    render: (props) => <TeacherActiveSubjectsTab {...props} />,
  },
  {
    id: 'historial-materias-dictadas',
    label: 'Historial de materias dictadas',
    icon: 'history',
    render: (props) => <TeacherSubjectHistoryTab {...props} />,
  },
  {
    id: 'examenes-activos',
    label: 'Exámenes activos',
    icon: 'exam',
    render: (props) => <TeacherActiveExamsTab {...props} />,
  },
  {
    id: 'historial-examenes',
    label: 'Historial de exámenes',
    icon: 'exam-history',
    render: (props) => <TeacherExamHistoryTab {...props} />,
  },
  ...ROLE_MANAGEMENT_TABS,
]

/** 3. Configuración para ADMIN (Sección Usuarios) */
const ADMIN_TABS: readonly ProfileTabConfig[] = [
  ...BASE_TABS,
  ...ROLE_MANAGEMENT_TABS,
]

/**
 * Selector declarativo que devuelve las pestañas exactas según el Rol
 * y el contexto de navegación ('students' | 'teachers' | 'users').
 */
export function getProfileTabs(
  role: EntityRole,
  _context: ProfileModuleContext,
): readonly ProfileTabConfig[] {
  switch (role) {
    case 'STUDENT':
      return STUDENT_TABS
    case 'TEACHER':
      return TEACHER_TABS
    case 'ADMIN':
      return ADMIN_TABS
  }
}

/**
 * Devuelve la ruta de retorno para el botón "< Regresar" según desde dónde entró el usuario.
 */
export function getBackRouteByContext(context: ProfileModuleContext): string {
  switch (context) {
    case 'students':
      return '/admin/students/manage'
    case 'teachers':
      return '/admin/teachers'
    case 'users':
      return '/admin/users/manage'
  }
}