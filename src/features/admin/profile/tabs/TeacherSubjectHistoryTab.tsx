import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export function TeacherSubjectHistoryTab({ entity }: ProfileTabComponentProps) {
  return (
    <section className={layoutStyles.sectionCard}>
      <h2>Historial de materias dictadas</h2>
      <p>
        Registro histórico de asignaturas impartidas por{' '}
        <strong>{entity.first_names}</strong> en gestiones pasadas.
      </p>
    </section>
  )
}