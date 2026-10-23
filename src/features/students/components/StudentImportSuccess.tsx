import { useState } from 'react'
import { getStudentImportOutcome } from '@/features/students/api/studentImportApi'
import type { StudentImportConfirmation } from '@/features/students/types/studentImport'
import styles from './StudentImportDesign.module.css'
import pageStyles from '@/features/students/pages/ImportStudentsPage.module.css'

const PAGE_SIZE = 10
const STATUS_LABELS = { IMPORTED: 'Importado', SKIPPED: 'Omitido', FAILED: 'Fallido' }

export function StudentImportSuccess({
  confirmation,
  onImportAnotherFile,
  onBackToPanel,
}: {
  confirmation: StudentImportConfirmation
  onImportAnotherFile: () => void
  onBackToPanel: () => void
}) {
  const [page, setPage] = useState(1)
  const outcome = getStudentImportOutcome(confirmation)
  const totalPages = Math.max(1, Math.ceil(confirmation.results.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const results = confirmation.results.slice(start, start + PAGE_SIZE)

  return (
    <section className={styles.successPanel} aria-live="polite">
      <div className={styles.successHeader}>
        {outcome.kind === 'complete' && !outcome.auditWarning ? <SuccessIcon /> : null}
        <div>
          <h3>{outcome.title}</h3>
          <p>{outcome.message}</p>
        </div>
      </div>

      <div className={styles.successSummary} aria-label="Resumen final de importación">
        <SummaryItem label="Procesados" value={confirmation.total_rows} />
        <SummaryItem label="Importados" value={confirmation.imported_rows} />
        <SummaryItem label="Omitidos" value={confirmation.skipped_rows} />
        <SummaryItem label="Fallidos" value={confirmation.failed_rows} />
      </div>

      <div className={pageStyles.reviewMessage}
        data-tone={outcome.auditWarning ? 'warning' : 'ready'} role={outcome.auditWarning ? 'alert' : 'status'}>
        <strong>{confirmation.audit_status === 'FAILED'
          ? 'No se registró el resumen de auditoría STUDENT_IMPORT.'
          : 'Resumen de auditoría STUDENT_IMPORT registrado.'}</strong>
        {outcome.auditWarning ? <p>Los resultados individuales se conservan; esta advertencia no cambia las filas importadas.</p> : null}
        {confirmation.warnings.length > 0 ? (
          <ul>{confirmation.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
        ) : null}
      </div>

      <div className={styles.previewTableWrap}>
        <table className={styles.previewTable}>
          <caption>Resultados por fila del CSV</caption>
          <thead><tr>
            <th scope="col">Línea del CSV</th><th scope="col">SIS</th>
            <th scope="col">Estado final</th><th scope="col">Motivos</th>
          </tr></thead>
          <tbody>{results.map((result) => (
            <tr key={result.row} data-valid={result.status === 'IMPORTED'}>
              <td>{result.row}</td><td>{result.sis_code || 'Sin SIS'}</td>
              <td>{STATUS_LABELS[result.status]}</td>
              <td>{result.errors.length > 0
                ? <ul>{result.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
                : 'Sin observaciones'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className={pageStyles.tablePager}>
        <span className={pageStyles.pagerSummary}>
          {results.length > 0
            ? `Mostrando ${start + 1} a ${start + results.length} de ${confirmation.results.length} resultados`
            : 'No hay resultados de filas.'}
        </span>
        {totalPages > 1 ? (
          <div className={pageStyles.pagerControls}>
            <button type="button" className={pageStyles.pagerButton}
              disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
            <span className={pageStyles.pagerPage}>Página {currentPage} de {totalPages}</span>
            <button type="button" className={pageStyles.pagerButton}
              disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
          </div>
        ) : null}
      </div>

      <div className={styles.panelActions}>
        <button type="button" className={pageStyles.cancelButton} onClick={onBackToPanel}>
          Volver a Gestión de estudiantes
        </button>
        <button type="button" className={pageStyles.continueButton} onClick={onImportAnotherFile}>
          Importar otro archivo
        </button>
      </div>
    </section>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SuccessIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  )
}
