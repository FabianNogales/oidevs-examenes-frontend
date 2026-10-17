import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export function CollaboratorRoleTab({
  entity,
  moduleContext,
}: ProfileTabComponentProps) {
  return (
    <section className={layoutStyles.sectionCard}>
      <h2>Rol colaborador</h2>
      <p>
        Gestión de asignación y permisos de ayudantía / control de ingreso para{' '}
        <strong>{entity.first_names}</strong> (Contexto activo: {moduleContext}).
      </p>
    </section>
  )
}