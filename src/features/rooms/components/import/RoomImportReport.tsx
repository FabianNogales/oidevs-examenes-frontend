import type {
  RoomImportConfirmation,
  RoomImportReport as Report,
} from '../../types/roomImport.types'
import { RoomImportSummary } from './RoomImportSummary'
import { RoomImportTable } from './RoomImportTable'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

export function RoomImportReport({
  report,
  confirmed = false,
}: {
  report: Report | RoomImportConfirmation
  confirmed?: boolean
}) {
  return (
    <>
      {report.errors.length > 0 && (
        <div className={styles.fileObservations} role="alert">
          <strong>Observaciones del archivo</strong>
          <ul>
            {report.errors.map((message, index) => (
              <li key={`${index}-${message}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      <RoomImportSummary report={report} confirmed={confirmed} />
      <RoomImportTable
        key={confirmed ? 'result' : 'preview'}
        rows={report.rows}
        confirmed={confirmed}
      />
    </>
  )
}
