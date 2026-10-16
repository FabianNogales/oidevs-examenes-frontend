import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router'
import { Snackbar } from '@/shared/components/Snackbar'
import type { AuthNotice } from '@/features/auth/types/auth'
import { useRoomImport } from '../../hooks/useRoomImport'
import {
  downloadRoomCsvTemplate,
  formatRoomFileSize,
  ROOM_CSV_COLUMNS,
} from '../../utils/roomCsv'
import { RoomCsvDropzone } from './RoomCsvDropzone'
import { RoomImportReport } from './RoomImportReport'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'
import local from '../../pages/ImportRoomsPage.module.css'

export function RoomImportPanel() {
  const navigate = useNavigate()
  const [notice, setNotice] = useState<AuthNotice | null>(null)
  const notify = useCallback(
    (type: 'success' | 'error' | 'info', message: string) =>
      setNotice({ id: Date.now(), type, message }),
    [],
  )
  const dismiss = useCallback(() => setNotice(null), [])
  const { flow, error, reset, select, validate, confirm, processing } =
    useRoomImport(notify)
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
      aria-labelledby="rooms-import-panel-title"
      aria-busy={processing}
    >
      <div className={styles.panelHeader}>
        <h2 id="rooms-import-panel-title" ref={heading} tabIndex={-1}>
          Archivo de aulas
        </h2>
        <button
          type="button"
          className={styles.templateButton}
          onClick={downloadRoomCsvTemplate}
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
            Incluye estas columnas en el orden indicado. Código y nombre son
            obligatorios; los demás valores son opcionales.
          </p>
          <div className={`${styles.columnsGuide} ${local.columns}`}>
            {ROOM_CSV_COLUMNS.map((column) => (
              <span key={column.key} title={column.header}>
                {column.label}
              </span>
            ))}
          </div>
          <RoomCsvDropzone
            file={flow.file}
            disabled={processing}
            onSelect={select}
            onRemove={reset}
            onError={(message) => notify('error', message)}
          />
          <div className={styles.infoBanner}>
            <span>
              Podrás revisar los datos y las observaciones del servidor antes de
              confirmar. Validar el archivo no registra aulas.
            </span>
          </div>
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={processing}
              onClick={() => {
                if (flow.file) reset()
                else navigate('/admin/rooms')
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
              <small>{formatRoomFileSize(flow.file.size)}</small>
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
              flow.preview.valid_rows === 0 || flow.preview.errors.length > 0
                ? 'warning'
                : flow.preview.error_rows
                  ? 'mixed'
                  : 'ready'
            }
            role="status"
          >
            <strong>
              {flow.preview.errors.length > 0
                ? 'El archivo tiene observaciones que impiden confirmar.'
                : flow.preview.valid_rows === 0
                  ? 'No hay aulas listas para importar.'
                  : flow.preview.error_rows
                    ? 'Algunos registros necesitan revisión.'
                    : 'Todas las aulas están listas para importar.'}
            </strong>
            <span>
              {flow.preview.errors.length > 0
                ? 'Corrige las observaciones generales y vuelve a validar el archivo.'
                : 'Solo se importarán las filas listas. Las filas con observaciones no se registrarán.'}
            </span>
          </div>
          <RoomImportReport report={flow.preview} />
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
              disabled={
                processing ||
                flow.preview.valid_rows === 0 ||
                flow.preview.errors.length > 0
              }
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
                  {flow.result.imported_rows > 0
                    ? 'Las aulas indicadas como importadas se registraron correctamente.'
                    : 'No se registraron aulas. Revisa las observaciones del reporte.'}
                </p>
              </div>
            </div>
            <RoomImportReport report={flow.result} confirmed />
          </div>
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => navigate('/admin/rooms')}
            >
              Volver a aulas
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
