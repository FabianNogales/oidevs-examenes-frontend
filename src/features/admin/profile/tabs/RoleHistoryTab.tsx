import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export function RoleHistoryTab({ entity }: ProfileTabComponentProps) {
  return (
    <section className={layoutStyles.sectionCard}>
      <h2>Historial de roles</h2>
      <p>
        Bitácora de roles y designaciones temporales ejercidas por{' '}
        <strong>{entity.first_names}</strong> en el sistema EIDA.
      </p>
    </section>
  )
}