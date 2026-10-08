import { useState } from 'react'
import type { RoomImportRow } from '../../types/roomImport.types'
import { ROOM_CSV_COLUMNS } from '../../utils/roomCsv'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'
import local from '../../pages/ImportRoomsPage.module.css'

const PAGE_SIZE = 20

export function RoomImportTable({
  rows,
  confirmed = false,
}: {
  rows: RoomImportRow[]
  confirmed?: boolean
}) {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const filtered = rows.filter(
    (row) => filter === 'all' || (filter === 'valid' ? row.valid : !row.valid),
  )
  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, lastPage)
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )
  return (
    <section className={styles.studentsPreview} aria-label="Reporte de aulas">
      <div className={styles.studentsPreviewHeader}>
        <h3>{confirmed ? 'Resultado por aula' : 'Aulas encontradas'}</h3>
        <label className={local.filter}>
          Mostrar registros
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value="all">Todos</option>
            <option value="valid">
              {confirmed ? 'Importados' : 'Listos para importar'}
            </option>
            <option value="invalid">
              {confirmed ? 'No importados' : 'Con observaciones'}
            </option>
          </select>
        </label>
      </div>
      {visible.length ? (
        <div className={styles.previewTableWrap}>
          <table className={styles.previewTable}>
            <caption className={local.srOnly}>
              Reporte de aulas por fila del CSV
            </caption>
            <thead>
              <tr>
                {ROOM_CSV_COLUMNS.map((column) => (
                  <th scope="col" key={column.key}>
                    {column.label}
                  </th>
                ))}
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.row} data-valid={row.valid}>
                  {ROOM_CSV_COLUMNS.map((column) => (
                    <td key={column.key} data-label={column.label}>
                      {row.data[column.key] || '—'}
                    </td>
                  ))}
                  <td data-label="Estado">
                    {row.valid ? (
                      <span className={styles.readyBadge}>
                        {confirmed ? 'Importada' : 'Lista para importar'}
                      </span>
                    ) : (
                      <div className={styles.rowObservations}>
                        <strong>Fila {row.row}</strong>
                        <ul>
                          {row.errors.map((error, index) => (
                            <li key={`${index}-${error}`}>{error}</li>
                          ))}
                        </ul>
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
            {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} de{' '}
            {filtered.length} registros
          </span>
          <div>
            <button
              type="button"
              className={styles.changeFileButton}
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </button>
            <span>
              Página {currentPage} de {lastPage}
            </span>
            <button
              type="button"
              className={styles.changeFileButton}
              disabled={currentPage === lastPage}
              onClick={() => setPage(currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}
    </section>
  )
}
