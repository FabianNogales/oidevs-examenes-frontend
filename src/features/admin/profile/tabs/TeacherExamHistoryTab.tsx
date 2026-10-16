import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export function TeacherExamHistoryTab({ entity }: ProfileTabComponentProps) {
  return (
    <section className={layoutStyles.sectionCard}>
      <h2>Historial de exámenes</h2>
      <p>
        Archivo de evaluaciones finalizadas y reportes de asistencia del docente{' '}
        <strong>{entity.first_names}</strong>.
      </p>
    </section>
  )
}