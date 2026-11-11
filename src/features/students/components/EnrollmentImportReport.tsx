import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import {
  importStatusLabel,
  translateVisibleMessage,
} from '@/shared/api/visibleMessage'
import type { CsvImportSummary } from '../types/student.types'
import styles from '@/shared/styles/CsvImportReport.module.css'

type Row = {
  id: number
  row: number
  sis: string
  result: string
  reason: string
}
const columns: TableColumnDef<Row>[] = [
  { id: 'row', header: 'Fila', accessorKey: 'row', width: '10%' },
  { id: 'sis', header: 'SIS', accessorKey: 'sis', width: '25%' },
  { id: 'result', header: 'Estado', accessorKey: 'result', width: '20%' },
  { id: 'reason', header: 'Observación', accessorKey: 'reason' },
]

export function EnrollmentImportReport({
  summary,
  confirmed,
}: {
  summary: CsvImportSummary
  confirmed: boolean
}) {
  return (
    <section
      className={styles.previewPanel}
      aria-label="Reporte de importación"
    >
      <h3>
        {confirmed
          ? 'Resultado de importación'
          : 'Vista previa: aún no se guardaron inscripciones'}
      </h3>
      <div className={styles.previewSummary}>
        {[
          [
            confirmed ? 'Agregados' : 'Listos para importar',
            summary.validCount,
          ],
          ['Duplicados', summary.duplicateCount ?? 'No informado'],
          ['Errores', summary.errorCount],
        ].map(([label, count]) => (
          <div className={styles.summaryItem} key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      {summary.totalProcessed != null && (
        <p>Total procesados: {summary.totalProcessed}</p>
      )}
      <DataTable
        columns={columns}
        data={(summary.records ?? summary.issues).map((record, id) => ({
          id,
          row: record.row,
          sis: record.sis || 'Sin SIS',
          result: record.status
            ? importStatusLabel(record.status)
            : 'Observación',
          reason: translateVisibleMessage(record.reason),
        }))}
        loading={false}
        emptyTitle="Sin observaciones por fila"
        emptyDescription="Revisa los totales antes de continuar."
      />
    </section>
  )
}
