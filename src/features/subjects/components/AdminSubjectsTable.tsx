import type { AdminSubject } from '../types/adminSubject.types'
import styles from '../pages/AdminSubjectsPage.module.css'

export function AdminSubjectsTable({
  subjects,
  onDetail,
  onEdit,
  onStatusChange,
}: {
  subjects: AdminSubject[]
  onDetail: (id: number) => void
  onEdit: (id: number) => void
  onStatusChange: (subject: AdminSubject) => void
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>
          Catálogo de materias y sus carreras
        </caption>
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Materia</th>
            <th scope="col">Carreras</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.id}>
              <th scope="row" data-label="Código">
                {subject.code}
              </th>
              <td data-label="Materia">{subject.name}</td>
              <td data-label="Carreras">
                <div className={styles.careerList}>
                  {subject.careers.length ? (
                    subject.careers.map((career) => (
                      <span className={styles.careerChip} key={career.id}>
                        {career.name}
                        {career.status === 'INACTIVE' ? ' (inactiva)' : ''}
                      </span>
                    ))
                  ) : (
                    <span className={styles.muted}>Sin carreras asociadas</span>
                  )}
                </div>
              </td>
              <td data-label="Estado">
                <span
                  className={
                    subject.status === 'ACTIVE'
                      ? styles.successBadge
                      : styles.inactiveBadge
                  }
                >
                  {subject.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td data-label="Acciones">
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => onDetail(subject.id)}
                    aria-label={`Ver detalle de ${subject.code}`}
                  >
                    Ver detalle
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => onEdit(subject.id)}
                    aria-label={`Editar materia ${subject.code}`}
                  >
                    Editar materia
                  </button>
                  <button
                    type="button"
                    className={
                      subject.status === 'ACTIVE'
                        ? styles.deactivateButton
                        : styles.secondaryButton
                    }
                    onClick={() => onStatusChange(subject)}
                    aria-label={`${subject.status === 'ACTIVE' ? 'Desactivar' : 'Activar'} materia ${subject.code}`}
                  >
                    {subject.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
