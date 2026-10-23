import { useState } from 'react'
import { translateVisibleMessage } from '@/shared/api/visibleMessage'
import type {
  OfferingImportPreview,
  OfferingImportConfirmation,
} from '../types/offeringImport.types'
import { downloadOfferingReport } from '../utils/offeringCsv'
import styles from './OfferingImport.module.css'
import local from '../pages/AdminCourseOfferingsPage.module.css'

export function OfferingImportReport({
  report,
}: {
  report: OfferingImportPreview | OfferingImportConfirmation
}) {
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const confirmed = 'imported' in report.summary
  const summary = report.summary
  const values =
    'imported' in summary
      ? [
          ['Total', summary.total],
          ['Importadas', summary.imported],
          ['Con errores', summary.failed],
          ['Omitidas', summary.omitted],
        ]
      : [
          ['Total', summary.total],
          ['Listas', summary.valid],
          ['Con errores', summary.invalid],
          ['Omitidas', summary.omitted],
        ]
  const filtered = report.rows.filter(
    (row) => filter === 'ALL' || row.status === filter,
  )
  const lastPage = Math.max(1, Math.ceil(filtered.length / 20))
  const currentPage = Math.min(page, lastPage)
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20)
  return (
    <section
      className={styles.previewPanel}
      aria-label="Reporte de asignaciones"
    >
      <h3>
        {confirmed
          ? 'Resultado de importación'
          : 'Vista previa de asignaciones'}
      </h3>
      <div className={local.importSummary}>
        {values.map(([label, value]) => (
          <div className={styles.summaryItem} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className={local.formActions}>
        <label className={local.filter}>
          Mostrar filas
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value="ALL">Todas</option>
            <option value={confirmed ? 'IMPORTED' : 'VALID'}>
              {confirmed ? 'Importadas' : 'Listas para importar'}
            </option>
            <option value="ERROR">Con errores</option>
            <option value="OMITTED">Omitidas</option>
          </select>
        </label>
        <button
          type="button"
          className={local.secondaryButton}
          onClick={() => downloadOfferingReport(report)}
        >
          Descargar reporte CSV
        </button>
      </div>
      <div className={styles.previewTableWrap}>
        <table className={styles.previewTable}>
          <caption className={local.srOnly}>
            Estado y observaciones por fila del CSV de asignaciones
          </caption>
          <thead>
            <tr>
              <th scope="col">Fila</th>
              <th scope="col">Correo docente</th>
              <th scope="col">Código materia</th>
              <th scope="col">Estado y observaciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.row_number}
                data-valid={row.status === 'VALID' || row.status === 'IMPORTED'}
              >
                <td data-label="Fila">{row.row_number}</td>
                <td data-label="Correo docente">{row.data.correo_docente}</td>
                <td data-label="Materia">{row.data.codigo_materia}</td>
                <td data-label="Estado">
                  <strong>
                    {row.status === 'VALID'
                      ? 'Lista para importar'
                      : row.status === 'IMPORTED'
                        ? 'Importada'
                        : row.status === 'OMITTED'
                          ? 'Omitida'
                          : 'Con errores'}
                  </strong>
                  {row.errors.length > 0 && (
                    <ul>
                      {row.errors.map((message, index) => (
                        <li key={index}>{translateVisibleMessage(message)}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && <p role="status">No hay filas con este filtro.</p>}
      <nav className={local.pagination} aria-label="Paginación del reporte CSV">
        <p>
          {filtered.length} filas · Página {currentPage} de {lastPage}
        </p>
        <div>
          <button
            type="button"
            className={local.secondaryButton}
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            className={local.secondaryButton}
            disabled={currentPage >= lastPage}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente
          </button>
        </div>
      </nav>
    </section>
  )
}
