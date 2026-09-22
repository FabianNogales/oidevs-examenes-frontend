import type { StudentImportPreview } from '@/features/students/types/studentImport'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

export function StudentImportSummary({
  preview,
}: {
  preview: StudentImportPreview
}) {
  return (
    <section className={styles.previewPanel} aria-labelledby="student-import-summary-title">
      <h3 id="student-import-summary-title">Resumen de importacion</h3>
      <div className={styles.previewSummary}>
        <SummaryItem label="Total de registros" value={preview.total_rows} />
        <SummaryItem label="Listos para importar" value={preview.valid_rows} />
        <SummaryItem label="Con observaciones" value={preview.error_rows} />
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
