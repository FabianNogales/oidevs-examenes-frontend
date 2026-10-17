import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export function TeacherActiveExamsTab({ entity }: ProfileTabComponentProps) {
  return (
    <section className={layoutStyles.sectionCard}>
      <h2>Exámenes activos</h2>
      <p>
        Evaluaciones programadas y en curso asociadas al docente{' '}
        <strong>{entity.first_names}</strong>.
      </p>
    </section>
  )
}