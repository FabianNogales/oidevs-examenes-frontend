import type {
  RoomImportConfirmation,
  RoomImportReport,
} from '../../types/roomImport.types'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

export function RoomImportSummary({
  report,
  confirmed = false,
}: {
  report: RoomImportReport | RoomImportConfirmation
  confirmed?: boolean
}) {
  const values =
    confirmed && 'imported_rows' in report
      ? [
          ['Procesados', report.total_rows],
          ['Importados', report.imported_rows],
          ['No importados', report.failed_rows],
        ]
      : [
          ['Total de registros', report.total_rows],
          ['Listos para importar', report.valid_rows],
          ['Con observaciones', report.error_rows],
        ]
  return (
    <section
      className={styles.previewPanel}
      aria-label={
        confirmed ? 'Resumen final de importación' : 'Resumen de importación'
      }
    >
      <h3>
        {confirmed ? 'Resumen final de importación' : 'Resumen de importación'}
      </h3>
      <div className={styles.previewSummary}>
        {values.map(([label, value]) => (
          <div key={label} className={styles.summaryItem}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
