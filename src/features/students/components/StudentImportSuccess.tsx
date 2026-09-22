import type { StudentImportConfirmation } from '@/features/students/types/studentImport'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

export function StudentImportSuccess({
  confirmation,
  onImportAnotherFile,
  onBackToPanel,
}: {
  confirmation: StudentImportConfirmation
  onImportAnotherFile: () => void
  onBackToPanel: () => void
}) {
  return (
    <section className={styles.successPanel} aria-live="polite">
      <div className={styles.successHeader}>
        <SuccessIcon />
        <div>
          <h3>Importacion completada</h3>
          <p>Los estudiantes fueron registrados correctamente.</p>
        </div>
      </div>

      <div className={styles.successSummary} aria-label="Resumen final de importacion">
        <SummaryItem label="Procesados" value={confirmation.total_rows} />
        <SummaryItem label="Importados" value={confirmation.imported_rows} />
        <SummaryItem label="No importados" value={confirmation.failed_rows} />
      </div>

      <div className={styles.panelActions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onBackToPanel}
        >
          Volver al panel
        </button>
        <button
          type="button"
          className={styles.continueButton}
          onClick={onImportAnotherFile}
        >
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
