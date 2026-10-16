import { useState } from 'react'
import type { SubjectImportRow } from '../../types/subjectImport.types'
import { SUBJECT_CSV_COLUMNS } from '../../utils/subjectCsv'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'
import local from '../../pages/ImportSubjectsPage.module.css'

const PAGE_SIZE = 20
export function SubjectImportTable({
  rows,
  confirmed,
}: {
  rows: SubjectImportRow[]
  confirmed: boolean
}) {
  const [filter, setFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const filtered = rows.filter(
    (row) => filter === 'ALL' || row.status === filter,
  )
  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, lastPage)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  return (
    <section
      className={styles.studentsPreview}
      aria-label="Reporte de materias"
    >
      <div className={styles.studentsPreviewHeader}>
        <h3>
          {confirmed ? 'Resultado por fila' : 'Materias y carreras encontradas'}
        </h3>
        <label className={local.filter}>
          Mostrar registros
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value="ALL">Todos</option>
            <option value={confirmed ? 'IMPORTED' : 'VALID'}>
              {confirmed ? 'Importados' : 'Listos para importar'}
            </option>
            <option value="ERROR">Con errores</option>
            <option value="OMITTED">Omitidos</option>
          </select>
        </label>
      </div>
      {visible.length ? (
        <div className={styles.previewTableWrap}>
          <table className={styles.previewTable}>
            <caption className={local.srOnly}>
              Reporte por fila del CSV de materias
            </caption>
            <thead>
              <tr>
                <th scope="col">Fila</th>
                {SUBJECT_CSV_COLUMNS.map((column) => (
                  <th scope="col" key={column.key}>
                    {column.label}
                  </th>
                ))}
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.row_number}
                  data-valid={
                    row.status === 'VALID' || row.status === 'IMPORTED'
                  }
                >
                  <td data-label="Fila">{row.row_number}</td>
                  {SUBJECT_CSV_COLUMNS.map((column) => (
                    <td data-label={column.label} key={column.key}>
                      {row.data[column.key] || '—'}
                    </td>
                  ))}
                  <td data-label="Estado">
                    {row.status === 'VALID' || row.status === 'IMPORTED' ? (
                      <span className={styles.readyBadge}>
                        {confirmed ? 'Importada' : 'Lista para importar'}
                      </span>
                    ) : (
                      <div className={styles.rowObservations}>
                        <strong>
                          {row.status === 'OMITTED' ? 'Omitida' : 'Con errores'}
                        </strong>
                        {row.errors.length ? (
                          <ul>
                            {row.errors.map((error, index) => (
                              <li key={`${index}-${error}`}>{error}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>
                            La asociación ya existe o está repetida; no se
                            realizará una nueva inserción.
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p role="status">No hay registros con este filtro.</p>
      )}
      {filtered.length > 0 && (
        <nav
          className={local.pagination}
          aria-label="Paginación del reporte CSV"
        >
          <span role="status">
            {(current - 1) * PAGE_SIZE + 1}–
            {Math.min(current * PAGE_SIZE, filtered.length)} de{' '}
            {filtered.length} filas
          </span>
          <div>
            <button
              type="button"
              className={styles.changeFileButton}
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </button>
            <span>
              Página {current} de {lastPage}
            </span>
            <button
              type="button"
              className={styles.changeFileButton}
              disabled={current === lastPage}
              onClick={() => setPage(current + 1)}
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}
    </section>
  )
}
