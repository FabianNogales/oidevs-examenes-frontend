import { NavLink, useLocation } from 'react-router'
import styles from '../pages/Incidents.module.css'

export function ExamIncidentNavigation({
  examId,
  search = '',
}: {
  examId: number
  search?: string
}) {
  const { pathname } = useLocation()
  const disciplineActive = /\/(incidents|infractions|expulsions|cases)(\/|$)/.test(
    pathname,
  )
  return (
    <nav className={styles.navigation} aria-label="Secciones del examen">
      <NavLink end to={`/teacher/exams/${examId}${search}`}>
        Resumen
      </NavLink>
      <NavLink
        className={() => (disciplineActive ? 'active' : '')}
        aria-current={disciplineActive ? 'page' : undefined}
        to={`/exams/${examId}/incidents?from=teacher`}
      >
        Incidencias e infracciones
      </NavLink>
      <NavLink to={`/teacher/exams/${examId}/attendance`}>Asistencia</NavLink>
      <NavLink to={`/teacher/exams/${examId}/reports`}>Informes del examen</NavLink>
    </nav>
  )
}
