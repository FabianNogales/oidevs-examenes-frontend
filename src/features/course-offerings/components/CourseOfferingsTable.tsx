import type { CourseOffering } from '../types/courseOffering.types'
import styles from '../pages/AdminCourseOfferingsPage.module.css'

export function CourseOfferingsTable({
  offerings,
  showTeacher = true,
  onAction,
}: {
  offerings: CourseOffering[]
  showTeacher?: boolean
  onAction?: (id: number, mode: 'edit' | 'status') => void
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>
          Materias asignadas por periodo académico
        </caption>
        <thead>
          <tr>
            {showTeacher && <th scope="col">Docente</th>}
            <th scope="col">Materia</th>
            <th scope="col">Carreras</th>
            <th scope="col">Periodo</th>
            <th scope="col">Estado de la oferta</th>
            <th scope="col">Historial</th>
            {onAction && <th scope="col">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {offerings.map((offering) => (
            <tr key={offering.id}>
              {showTeacher && (
                <td data-label="Docente">
                  <strong>
                    {offering.teacher.first_names} {offering.teacher.last_names}
                  </strong>
                  <small>{offering.teacher.institutional_code}</small>
                  <small>{offering.teacher.email}</small>
                </td>
              )}
              <th scope="row" data-label="Materia">
                {offering.subject.name}
                <small>{offering.subject.code}</small>
                {offering.subject.status === 'INACTIVE' && (
                  <small>Materia inactiva en el catálogo</small>
                )}
              </th>
              <td data-label="Carreras">
                <div className={styles.careerList}>
                  {offering.subject.careers.length ? (
                    offering.subject.careers.map((career) => (
                      <span key={career.id} className={styles.careerChip}>
                        {career.name}
                      </span>
                    ))
                  ) : (
                    <span>Sin carreras asociadas</span>
                  )}
                </div>
              </td>
              <td data-label="Periodo">
                {offering.academic_term.name}
                {offering.academic_term.status === 'INACTIVE' && (
                  <small>Periodo inactivo</small>
                )}
              </td>
              <td data-label="Estado">
                <span
                  className={
                    offering.status === 'ACTIVE'
                      ? styles.successBadge
                      : styles.neutralBadge
                  }
                >
                  {offering.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td data-label="Historial">
                {offering.enrollments_count} inscripciones
                <small>{offering.exams_count} exámenes</small>
              </td>
              {onAction && (
                <td data-label="Acciones">
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => onAction(offering.id, 'edit')}
                      aria-label={`Editar oferta de ${offering.subject.name} para ${offering.teacher.first_names} ${offering.teacher.last_names}`}
                    >
                      Editar oferta
                    </button>
                    <button
                      type="button"
                      className={
                        offering.status === 'ACTIVE'
                          ? styles.deactivateButton
                          : styles.secondaryButton
                      }
                      onClick={() => onAction(offering.id, 'status')}
                      aria-label={`${offering.status === 'ACTIVE' ? 'Desactivar' : 'Activar'} oferta de ${offering.subject.name} para ${offering.teacher.first_names} ${offering.teacher.last_names}`}
                    >
                      {offering.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
