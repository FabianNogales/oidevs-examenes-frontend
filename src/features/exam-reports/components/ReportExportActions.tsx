import { useEffect, useRef, useState } from 'react'
import { downloadBlob } from '@/shared/utils/downloadBlob'
import { exportExamReport } from '../api/examReportsApi'
import { ExamReportError } from '../api/reportErrors'
import type {
  ExamReportPage,
  ReportExam,
  ReportFilters,
  ReportFormat,
} from '../types/report.types'
import styles from '../pages/ExamReports.module.css'
export function ReportExportActions({
  exam,
  filters,
  page,
}: {
  exam: ReportExam
  filters: ReportFilters
  page: ExamReportPage
}) {
  const request = useRef<AbortController | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null),
    [blocked, setBlocked] = useState(false)
  useEffect(
    () => () => {
      request.current?.abort()
    },
    [],
  )
  async function download(format: ReportFormat) {
    if (request.current || blocked) return
    const c = new AbortController()
    request.current = c
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const blob = await exportExamReport(exam, filters, page, format, c.signal)
      if (!c.signal.aborted) {
        downloadBlob(
          blob,
          `reporte-examen-${exam.id}-${page.report.type.toLowerCase()}-${page.report.id}.${format}`,
        )
        setNotice(
          `Descarga iniciada con los ${page.report.total_records} registros del reporte generado y sus filtros aplicados.`,
        )
      }
    } catch (e) {
      if (!c.signal.aborted) {
        setError(
          e instanceof Error ? e.message : 'No se pudo descargar el reporte.',
        )
        setBlocked(
          e instanceof ExamReportError &&
            [401, 403, 410].includes(e.status ?? 0),
        )
      }
    } finally {
      if (!c.signal.aborted) {
        request.current = null
        setBusy(false)
      }
    }
  }
  return (
    <section aria-label="Descarga del reporte generado" aria-busy={busy}>
      <div className={styles.actions}>
        {page.report.formats.map((f) => (
          <button
            key={f}
            type="button"
            disabled={busy || blocked}
            onClick={() => void download(f)}
          >
            Exportar {f.toUpperCase()}
          </button>
        ))}
      </div>
      {!page.report.formats.length && (
        <p>No hay formatos de exportación autorizados para este reporte.</p>
      )}
      {busy && <p role="status">Preparando descarga…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
