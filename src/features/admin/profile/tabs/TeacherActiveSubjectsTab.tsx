import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export function TeacherActiveSubjectsTab({ entity }: ProfileTabComponentProps) {
  return (
    <section className={layoutStyles.sectionCard}>
      <h2>Materias que dicta</h2>
      <p>
        Asignaturas y grupos actualmente a cargo del docente{' '}
        <strong>{entity.first_names}</strong>. (Módulo preparado para su implementación).
      </p>
    </section>
  )
}