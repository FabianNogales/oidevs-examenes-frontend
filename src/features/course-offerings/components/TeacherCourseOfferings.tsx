import { Link } from 'react-router'
import { CourseOfferingsPanel } from './CourseOfferingsPanel'
import styles from '../pages/AdminCourseOfferingsPage.module.css'

export function TeacherCourseOfferings({ teacherId }: { teacherId: number }) {
  return (
    <section
      className={styles.teacherSection}
      aria-label="Materias asignadas al docente"
    >
      <h3>Materias asignadas</h3>
      <CourseOfferingsPanel key={teacherId} teacherId={teacherId} />
      <Link
        className={styles.backLink}
        to={`/admin/teachers/assignments?teacher_id=${teacherId}`}
      >
        Gestionar asignaciones de este docente →
      </Link>
    </section>
  )
}
