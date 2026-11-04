import { useEffect, useRef, useState } from 'react'
import { downloadBlob } from '@/shared/utils/downloadBlob'
import { exportIncidentReport } from '../api/incidentExportApi'
import type { IncidentReportFormat } from '../api/incidentExportApi'
import type { IncidentConsultationQuery } from '../types/incidentConsultation.types'
import { IncidentApiError } from '../api/incidentsApi'
import styles from '../pages/Incidents.module.css'

export function IncidentExportActions({
  examId,
  query,
}: {
  examId: number
  query: IncidentConsultationQuery
}) {
  const request = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  useEffect(
    () => () => {
      request.current?.abort()
    },
    [],
  )

  async function download(format: IncidentReportFormat) {
    if (request.current || forbidden) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const blob = await exportIncidentReport(
        examId,
        query,
        format,
        controller.signal,
      )
      if (!controller.signal.aborted) {
        downloadBlob(blob, `incidencias-examen-${examId}.${format}`)
        setMessage(
          'Descarga iniciada con todos los registros autorizados que coinciden con los filtros aplicados.',
        )
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo descargar el reporte.',
        )
        setForbidden(
          cause instanceof IncidentApiError &&
            [401, 403].includes(cause.status ?? 0),
        )
      }
    } finally {
      if (!controller.signal.aborted) {
        request.current = null
        setBusy(false)
      }
    }
  }
  return (
    <section aria-label="Exportación de incidencias" aria-busy={busy}>
      <div className={styles.access}>
        <button
          type="button"
          disabled={busy || forbidden}
          onClick={() => void download('csv')}
        >
          Exportar CSV
        </button>
        <button
          type="button"
          disabled={busy || forbidden}
          onClick={() => void download('pdf')}
        >
          Exportar PDF
        </button>
      </div>
      {busy && <p role="status">Generando reporte…</p>}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
