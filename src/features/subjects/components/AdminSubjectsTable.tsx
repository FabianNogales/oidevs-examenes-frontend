import type { AdminSubject } from '../types/adminSubject.types'
import styles from '../pages/AdminSubjectsPage.module.css'

export function AdminSubjectsTable({ subjects }: { subjects: AdminSubject[] }) {
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
