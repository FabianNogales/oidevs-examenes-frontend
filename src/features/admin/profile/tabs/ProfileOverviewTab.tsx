import { EntityInfoGrid } from '../components/EntityProfileLayout'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type {
  EntityInfoCard,
  ProfileTabComponentProps,
} from '../types/entityProfile.types'

const ROLE_NAME_MAP = {
  STUDENT: 'Estudiante',
  TEACHER: 'Docente',
  ADMIN: 'Administrador',
} as const

export function ProfileOverviewTab({ entity }: ProfileTabComponentProps) {
  const isActive = entity.status === 'ACTIVE'

  const cards: EntityInfoCard[] = [
    {
      id: 'first_names',
      label: 'Nombre',
      value: entity.first_names,
      icon: 'user',
    },
    {
      id: 'sis',
      label: 'Código institucional (SIS)',
      value: entity.institutional_code,
      icon: 'institution',
    },
    {
      id: 'last_names',
      label: 'Apellidos',
      value: entity.last_names,
      icon: 'user',
    },
    {
      id: 'career',
      label: entity.role === 'STUDENT' ? 'Carrera' : 'Unidad / Departamento',
      value: entity.career_name || 'Ingeniería de Sistemas',
      icon: 'career',
    },
    {
      id: 'email',
      label: 'Correo electrónico',
      value: entity.email,
      icon: 'mail',
    },
    {
      id: 'status',
      label: 'Estado de la cuenta',
      value: (
        <span
          className={`${layoutStyles.accountStatusPill} ${
            isActive
              ? layoutStyles.accountStatusActive
              : layoutStyles.accountStatusInactive
          }`}
        >
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
      icon: 'info',
    },
    {
      id: 'ci',
      label: 'Carnet de Identidad (CI)',
      value: entity.identity_number || 'No registrado',
      icon: 'id-card',
    },
    {
      id: 'role',
      label: 'Rol actual',
      value: ROLE_NAME_MAP[entity.role],
      icon: 'user',
    },
  ]

  return <EntityInfoGrid cards={cards} />
}