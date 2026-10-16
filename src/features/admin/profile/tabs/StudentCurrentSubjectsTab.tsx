import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export function StudentCurrentSubjectsTab({ entity }: ProfileTabComponentProps) {
  return (
    <section className={layoutStyles.sectionCard}>
      <h2>Materias actuales</h2>
      <p>
        Listado de materias en las que <strong>{entity.first_names}</strong> se
        encuentra inscrito en la gestión actual. (Módulo preparado para su implementación).
      </p>
    </section>
  )
}