import styles from '@/features/incidents/pages/Incidents.module.css'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/components/ui/Button/Button'
import { downloadBlob } from '@/shared/utils/downloadBlob'
import { httpClient } from '@/shared/api/httpClient'
import { caseError } from './disciplineApi'
export function CaseExport({
  examId,
  filters,
}: {
  examId: number
  filters: Record<string, string>
}) {
  const request = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function download(format: 'csv' | 'pdf') {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    try {
      const response = await httpClient.get<Blob>(
        `/exams/${examId}/discipline-cases/export`,
        {
          params: { ...filters, format },
          responseType: 'blob',
          signal: controller.signal,
        },
      )
      const blob = response.data,
        expected = format === 'pdf' ? 'application/pdf' : 'text/csv'
      if (
        !(blob instanceof Blob) ||
        !blob.size ||
        blob.type.split(';')[0] !== expected ||
        (format === 'pdf' && (await blob.slice(0, 5).text()) !== '%PDF-')
      )
        throw Error('El servidor no devolvió un reporte válido.')
      if (!controller.signal.aborted)
        downloadBlob(blob, `casos-examen-${examId}.${format}`)
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error && !('response' in cause)
            ? cause.message
            : caseError(cause),
        )
    } finally {
      if (!controller.signal.aborted) {
        request.current = null
        setBusy(false)
      }
    }
  }
  return (
    <section aria-label="Exportar casos" className={styles.access}>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => void download('csv')}
      >
        Exportar CSV
      </Button>{' '}
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() => void download('pdf')}
      >
        Exportar PDF
      </Button>
      {busy && <p role="status">Generando reporte…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
