import { useRef, useState } from 'react'
import { SubjectCsvDropzone } from '@/features/subjects/components/import/SubjectCsvDropzone'
import { useOfferingNavigationGuard } from '@/features/course-offerings/hooks/useOfferingNavigationGuard'
import { importStudentsCsv } from '../api/teacherStudentsApi'
import type { CsvImportSummary } from '../types/student.types'
import { EnrollmentImportReport } from './EnrollmentImportReport'
import styles from '@/shared/styles/CsvImport.module.css'

function downloadTemplate() {
  const url = URL.createObjectURL(
    new Blob(['\uFEFFsisCode\r\n'], { type: 'text/csv;charset=utf-8;' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla-inscripciones.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function EnrollmentImportPanel({
  offeringId,
  onReturn,
}: {
  offeringId: string
  onReturn: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [summary, setSummary] = useState<CsvImportSummary | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const busy = useRef(false)
  const blocked = useOfferingNavigationGuard(processing)
  function reset(next: File | null = null) {
    if (busy.current) return
    setSummary(null)
    setConfirmed(false)
    setError(null)
    setUncertain(false)
    if (next && next.size > 10 * 1024 * 1024) {
      setFile(null)
      setError('El archivo no debe superar los 10 MB.')
      return
    }
    if (next && (!next.name.toLowerCase().endsWith('.csv') || !next.size)) {
      setFile(null)
      setError('Selecciona un archivo CSV que no esté vacío.')
      return
    }
    setFile(next)
  }
  async function submit(confirm: boolean) {
    if (busy.current || !file || uncertain || confirmed) return
    busy.current = true
    setProcessing(true)
    setError(null)
    try {
      const result = await importStudentsCsv(offeringId, file, !confirm)
      setSummary(result)
      setConfirmed(confirm)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo procesar el archivo.',
      )
      if (confirm) setUncertain(true)
    } finally {
      busy.current = false
      setProcessing(false)
    }
  }
  return (
    <section
      className={styles.panel}
      aria-label="Importar estudiantes CSV"
      aria-busy={processing}
    >
      <header className={styles.panelHeader}>
        <div>
          <h2>Archivo de estudiantes</h2>
          <p className={styles.columnsIntro}>
            Una fila por estudiante. El SIS debe estar registrado en el sistema.
          </p>
        </div>
        <button
          type="button"
          className={styles.templateButton}
          disabled={processing}
          onClick={downloadTemplate}
        >
          Descargar plantilla CSV
        </button>
      </header>
      {(blocked || processing) && (
        <p role="status">Espera a que termine la operación antes de salir.</p>
      )}
      {error && <p role="alert">{error}</p>}
      {uncertain && (
        <p role="alert">
          No se pudo confirmar el resultado. Revisa la lista de estudiantes
          antes de intentar otra importación.
        </p>
      )}
      {!summary && (
        <>
          <div className={styles.columnsGuide}>
            <span>sisCode</span>
          </div>
          <SubjectCsvDropzone
            label="estudiantes"
            file={file}
            disabled={processing}
            onSelect={reset}
            onRemove={() => reset()}
            onError={setError}
          />
          <p className={styles.infoBanner}>
            Podrás revisar los datos antes de confirmar. Validar no guarda
            inscripciones.
          </p>
        </>
      )}
      {summary && (
        <EnrollmentImportReport summary={summary} confirmed={confirmed} />
      )}
      <footer className={styles.panelActions}>
        <button
          type="button"
          className={styles.cancelButton}
          disabled={processing}
          onClick={onReturn}
        >
          {confirmed || uncertain ? 'Ver estudiantes inscritos' : 'Cancelar'}
        </button>
        {summary && !confirmed && !uncertain && (
          <button
            type="button"
            className={styles.cancelButton}
            disabled={processing}
            onClick={() => reset()}
          >
            Cambiar archivo
          </button>
        )}
        {!confirmed && !uncertain && (
          <button
            type="button"
            className={styles.continueButton}
            disabled={
              processing ||
              !file ||
              (summary !== null && summary.validCount === 0)
            }
            onClick={() => void submit(Boolean(summary))}
          >
            {processing
              ? 'Procesando…'
              : summary
                ? 'Confirmar importación'
                : 'Validar y continuar'}
          </button>
        )}
        {confirmed && (
          <button
            type="button"
            className={styles.continueButton}
            onClick={() => reset()}
          >
            Importar otro archivo
          </button>
        )}
      </footer>
    </section>
  )
}
