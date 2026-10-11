import type { AcademicTerm } from '../types/academicTerm.types'
import { formatAcademicTermDate } from '../utils/academicTermDate'
import { AcademicTermStatusBadge } from './AcademicTermStatusBadge'
import styles from '../pages/AdminAcademicTermsPage.module.css'

export function AcademicTermsTable({
  terms,
  onDetail,
}: {
  terms: AcademicTerm[]
  onDetail: (id: number) => void
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>
          Periodos académicos registrados
        </caption>
        <thead>
          <tr>
            <th scope="col">Periodo</th>
            <th scope="col">Fecha de inicio</th>
            <th scope="col">Fecha de fin</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {terms.map((term) => (
            <tr key={term.id}>
              <th scope="row" data-label="Periodo">
                {term.name}
              </th>
              <td data-label="Fecha de inicio">
                <time dateTime={term.start_date}>
                  {formatAcademicTermDate(term.start_date)}
                </time>
              </td>
              <td data-label="Fecha de fin">
                <time dateTime={term.end_date}>
                  {formatAcademicTermDate(term.end_date)}
                </time>
              </td>
              <td data-label="Estado">
                <AcademicTermStatusBadge status={term.status} />
              </td>
              <td data-label="Acciones">
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    aria-label={`Ver detalle de ${term.name}`}
                    onClick={() => onDetail(term.id)}
                  >
                    Ver detalle
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
