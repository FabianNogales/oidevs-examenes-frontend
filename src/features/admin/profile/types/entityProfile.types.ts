import type { ReactNode } from 'react'

/** Roles oficiales que determinan el color del perfil y las pestañas disponibles */
export type EntityRole = 'STUDENT' | 'TEACHER' | 'ADMIN'

/** Desde qué módulo del Header se abrió este perfil */
export type ProfileModuleContext = 'students' | 'teachers' | 'users'

/** Identificadores de todos los iconos soportados en el menú lateral y tarjetas */
export type ProfileIconName =
  | 'user'
  | 'edit'
  | 'book'
  | 'history'
  | 'collaborator'
  | 'role-history'
  | 'exam'
  | 'exam-history'
  | 'institution'
  | 'career'
  | 'mail'
  | 'info'
  | 'id-card'

/** Modelo normalizado de cualquier usuario/entidad para renderizar su perfil */
export interface UnifiedEntityProfile {
  id: number | string
  institutional_code: string
  identity_number?: string
  first_names: string
  last_names: string
  email: string
  status: 'ACTIVE' | 'INACTIVE'
  role: EntityRole
  career_name?: string
}

/** Datos editables desde la pestaña "Editar datos" */
export interface EditableEntityValues {
  first_names: string
  last_names: string
  email: string
  status: 'ACTIVE' | 'INACTIVE'
}

/** Props que recibe cualquier subpágina/pestaña de opción */
export interface ProfileTabComponentProps {
  entity: UnifiedEntityProfile
  moduleContext: ProfileModuleContext
  onUpdateEntity?: (values: EditableEntityValues) => Promise<void>
  onNavigateTab: (tabId: string) => void
}

/** Definición de una opción del menú lateral y su respectivo componente */
export interface ProfileTabConfig {
  id: string
  label: string
  icon: ProfileIconName
  render: (props: ProfileTabComponentProps) => ReactNode
}

/** Tarjeta individual de la vista "Perfil" */
export interface EntityInfoCard {
  id: string
  label: string
  value: ReactNode
  icon: ProfileIconName
}