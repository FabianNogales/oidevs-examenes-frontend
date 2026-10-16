import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export function StudentSubjectHistoryTab({ entity }: ProfileTabComponentProps) {
  return (
    <section className={layoutStyles.sectionCard}>
      <h2>Historial de materias</h2>
      <p>
        Registro histórico de materias cursadas y evaluaciones previas de{' '}
        <strong>{entity.first_names}</strong>. (Módulo preparado para su implementación).
      </p>
    </section>
  )
}