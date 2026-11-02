import { NavLink } from 'react-router'
import styles from '../pages/Incidents.module.css'

export function ExamIncidentNavigation({
  examId,
  search = '',
}: {
  examId: number
  search?: string
}) {
  return (
    <nav className={styles.navigation} aria-label="Secciones del examen">
      <NavLink end to={`/teacher/exams/${examId}${search}`}>
        Resumen
      </NavLink>
      <NavLink to={`/exams/${examId}/incidents?from=teacher`}>
        Incidencias
      </NavLink>
    </nav>
  )
}
