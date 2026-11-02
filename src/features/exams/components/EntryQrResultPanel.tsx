import type { EntryQrResponse } from '../types/entryQr.types'
import { entryResultTone } from '../utils/entryRegistrationDisplay'
import { EntryQrStudentIdentity } from './EntryQrStudentIdentity'
import entryStyles from '../pages/EntryControlPage.module.css'
import styles from './EntryQr.module.css'

export function EntryQrResultPanel({
  response,
  processing,
}: {
  response: EntryQrResponse | null
  processing: boolean
}) {
  const student = response?.data?.student
  const processed = response ? new Date(response.processed_at) : null
  return (
    <section
      className={`${styles.resultPanel} ${response ? entryStyles[entryResultTone(response.result)] : ''}`}
      aria-label="Resultado del escaneo"
      aria-live="polite"
      aria-busy={processing}
    >
      <h2>Último escaneo</h2>
      {processing ? (
        <p role="status">Verificando QR y procesando ingreso…</p>
      ) : response ? (
        <>
          {student ? (
            <EntryQrStudentIdentity key={student.student_id} student={student} />
          ) : null}
          <p className={styles.lastScanResult}>
            {response.result === 'AUTHORIZED'
              ? 'Ingreso registrado'
              : response.result === 'ALREADY_REGISTERED'
                ? 'Ingreso ya registrado'
                : 'Incidencia'}
          </p>
          <time className={styles.timestamp} dateTime={response.processed_at}>
            {processed && !Number.isNaN(processed.getTime())
              ? processed.toLocaleTimeString('es-BO', { hour12: false })
              : response.processed_at}
          </time>
          <p>{response.message}</p>
        </>
      ) : (
        <div className={styles.resultEmpty}>
          <p>Aún no hay escaneos.</p>
          <p>Presenta un QR frente a la cámara.</p>
        </div>
      )}
    </section>
  )
}
