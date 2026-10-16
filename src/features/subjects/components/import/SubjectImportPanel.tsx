import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router'
import { Snackbar } from '@/shared/components/Snackbar'
import type { AuthNotice } from '@/features/auth/types/auth'
import { useSubjectImport } from '../../hooks/useSubjectImport'
import {
  downloadSubjectCsvTemplate,
  formatSubjectFileSize,
  SUBJECT_CSV_COLUMNS,
} from '../../utils/subjectCsv'
import { SubjectCsvDropzone } from './SubjectCsvDropzone'
import { SubjectImportReport } from './SubjectImportReport'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'
import local from '../../pages/ImportSubjectsPage.module.css'

export function SubjectImportPanel() {
  const navigate = useNavigate()
  const [notice, setNotice] = useState<AuthNotice | null>(null)
  const notify = useCallback(
    (type: 'success' | 'error' | 'info', message: string) =>
      setNotice({ id: Date.now(), type, message }),
    [],
  )
  const dismiss = useCallback(() => setNotice(null), [])
  const { flow, error, reset, select, validate, confirm, processing } =
    useSubjectImport(notify)
  const blocker = useBlocker(processing)
  useEffect(() => {
    if (!processing && blocker.state === 'blocked') blocker.reset()
  }, [processing, blocker])
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (flow.kind === 'preview' || flow.kind === 'success')
      heading.current?.focus()
  }, [flow.kind])

  return (
    <section
      className={`${styles.panel} ${local.panel}`}
      aria-labelledby="subjects-import-panel-title"
      aria-busy={processing}
    >
      <div className={styles.panelHeader}>
        <h2 id="subjects-import-panel-title" ref={heading} tabIndex={-1}>
          Archivo de materias
        </h2>
        <button
          type="button"
          className={styles.templateButton}
          onClick={downloadSubjectCsvTemplate}
          disabled={processing}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />
          </svg>
          Descargar plantilla CSV
        </button>
      </div>
      {error && (
        <div className={styles.fileObservations} role="alert">
          {error}
        </div>
      )}
      {blocker.state === 'blocked' && (
        <p role="status" className={styles.infoBanner}>
          Espera a que termine la operación antes de salir de esta pantalla.
        </p>
      )}
      {(flow.kind === 'select' || flow.kind === 'validating') && (
        <>
          <p className={styles.columnsIntro}>
            Una fila por materia y carrera. Repite el código de la materia con
            el mismo nombre si pertenece a varias carreras. Las tres columnas
            son obligatorias.
          </p>
          <div className={`${styles.columnsGuide} ${local.columns}`}>
            {SUBJECT_CSV_COLUMNS.map((column) => (
              <span key={column.key} title={column.header}>
                {column.header}
              </span>
            ))}
          </div>
          <SubjectCsvDropzone
            file={flow.file}
            disabled={processing}
            onSelect={select}
            onRemove={reset}
            onError={(message) => notify('error', message)}
          />
          <div className={styles.infoBanner}>
            <span>
              Las carreras deben estar registradas y activas. Podrás revisar las
              observaciones antes de confirmar. Validar el archivo no registra
              materias.
            </span>
          </div>
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={processing}
              onClick={() => {
                if (flow.file) reset()
                else navigate('/admin/subjects')
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.continueButton}
              disabled={!flow.file || processing}
              onClick={() => void validate()}
            >
              {processing ? 'Validando…' : 'Validar y continuar'}
            </button>
          </div>
        </>
      )}
      {(flow.kind === 'preview' || flow.kind === 'confirming') && (
        <>
          <div className={`${styles.selectedFileBar} ${local.fileBar}`}>
            <div>
              <span>Archivo seleccionado</span>
              <strong>{flow.file.name}</strong>
              <small>{formatSubjectFileSize(flow.file.size)}</small>
            </div>
            <button
              type="button"
              className={styles.changeFileButton}
              onClick={reset}
              disabled={processing}
            >
              Cambiar archivo
            </button>
          </div>
          <div
            className={styles.reviewMessage}
            data-tone={
              flow.preview.summary.valid === 0
                ? 'warning'
                : flow.preview.summary.invalid
                  ? 'mixed'
                  : 'ready'
            }
            role="status"
          >
            <strong>
              {flow.preview.summary.valid === 0
                ? 'No hay filas listas para importar.'
                : flow.preview.summary.invalid
                  ? 'Algunos registros necesitan revisión.'
                  : 'Las filas válidas están listas para importar.'}
            </strong>
            <span>
              Solo se importarán las filas listas. Las filas con errores u
              omitidas no se registrarán.
            </span>
          </div>
          <SubjectImportReport report={flow.preview} />
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={reset}
              disabled={processing}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.continueButton}
              disabled={processing || flow.preview.summary.valid === 0}
              onClick={() => void confirm()}
            >
              {processing ? 'Confirmando…' : 'Confirmar importación'}
            </button>
          </div>
        </>
      )}
      {flow.kind === 'success' && (
        <>
          <div className={styles.successPanel}>
            <div className={styles.successHeader}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 3 3 5-6" />
              </svg>
              <div>
                <h3>Importación completada</h3>
                <p>
                  {flow.result.summary.imported > 0
                    ? 'Las filas importadas registraron materias o agregaron asociaciones con carreras.'
                    : 'No se registraron materias. Revisa las observaciones del reporte.'}
                </p>
              </div>
            </div>
            <SubjectImportReport report={flow.result} confirmed />
          </div>
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => navigate('/admin/subjects')}
            >
              Volver a materias
            </button>
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
      <Snackbar notice={notice} onDismiss={dismiss} />
    </section>
  )
}
