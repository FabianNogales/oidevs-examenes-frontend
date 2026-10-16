import { useEffect, useRef } from 'react'
import { SubjectCsvDropzone as CsvDropzone } from '@/features/subjects/components/import/SubjectCsvDropzone'
import { useOfferingImport } from '../hooks/useOfferingImport'
import {
  downloadOfferingTemplate,
  OFFERING_CSV_HEADERS,
} from '../utils/offeringCsv'
import { OfferingImportReport } from './OfferingImportReport'
import styles from './OfferingImport.module.css'
import local from '../pages/AdminCourseOfferingsPage.module.css'

export function OfferingImportPanel({
  termId,
  onBusy,
  onSaved,
}: {
  termId: number
  onBusy: (busy: boolean) => void
  onSaved: () => void
}) {
  const {
    flow,
    error,
    reset,
    select,
    validate,
    confirm,
    processing,
    reportError,
  } = useOfferingImport(termId, onBusy, onSaved)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (flow.kind === 'preview' || flow.kind === 'success')
      heading.current?.focus()
  }, [flow.kind])
  return (
    <section
      className={styles.panel}
      aria-label="Importar asignaciones CSV"
      aria-busy={processing}
    >
      <div className={styles.panelHeader}>
        <h2 ref={heading} tabIndex={-1}>
          Archivo de asignaciones
        </h2>
        <button
          type="button"
          className={styles.templateButton}
          disabled={processing}
          onClick={downloadOfferingTemplate}
        >
          Descargar plantilla CSV
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.fileObservations}>
          {error}
        </p>
      )}
      {(flow.kind === 'select' || flow.kind === 'validating') && (
        <>
          <p className={styles.columnsIntro}>
            Una fila por docente y materia. El periodo seleccionado arriba se
            aplica a todo el archivo; no incluyas una columna de periodo.
          </p>
          <div className={`${styles.columnsGuide} ${local.importColumns}`}>
            {OFFERING_CSV_HEADERS.map((header) => (
              <span key={header}>{header}</span>
            ))}
          </div>
          <CsvDropzone
            styles={styles}
            label="asignaciones"
            file={flow.file}
            disabled={processing}
            onSelect={select}
            onRemove={reset}
            onError={reportError}
          />
          <p className={styles.infoBanner}>
            El docente y la materia deben existir y estar activos. Validar no
            guarda asignaciones; podrás revisar cada fila antes de confirmar.
          </p>
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={processing}
              onClick={reset}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.continueButton}
              disabled={processing || !flow.file}
              onClick={() => void validate()}
            >
              {processing ? 'Validando…' : 'Validar y continuar'}
            </button>
          </div>
        </>
      )}
      {(flow.kind === 'preview' || flow.kind === 'confirming') && (
        <>
          <p className={local.notice}>
            Archivo: <strong>{flow.file.name}</strong>. Se guardarán únicamente
            las filas listas. Las asignaciones existentes o repetidas se omiten
            sin reactivarlas.
          </p>
          <OfferingImportReport
            key={flow.preview.preview_id}
            report={flow.preview}
          />
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={processing}
              onClick={reset}
            >
              Cambiar archivo
            </button>
            <button
              type="button"
              className={styles.continueButton}
              disabled={processing || !flow.preview.summary.valid}
              onClick={() => void confirm()}
            >
              {processing ? 'Confirmando…' : 'Confirmar importación'}
            </button>
          </div>
        </>
      )}
      {flow.kind === 'success' && (
        <>
          <p className={local.notice} role="status">
            Importación completada: {flow.result.summary.imported} asignaciones
            registradas. Revisa el resultado por fila.
          </p>
          <OfferingImportReport
            key={`confirmed-${flow.result.preview_id}`}
            report={flow.result}
          />
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.continueButton}
              onClick={reset}
            >
              Importar otro archivo
            </button>
          </div>
        </>
      )}
    </section>
  )
}
