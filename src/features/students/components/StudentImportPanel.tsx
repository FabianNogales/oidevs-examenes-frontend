import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  confirmStudentImport,
  getStudentImportErrorMessage,
  previewStudentImport,
} from '@/features/students/api/studentImportApi'
import { CsvDropzone } from '@/features/students/components/CsvDropzone'
import { ImportColumnsGuide } from '@/features/students/components/ImportColumnsGuide'
import { StudentImportPreviewTable } from '@/features/students/components/StudentImportPreviewTable'
import { StudentImportSuccess } from '@/features/students/components/StudentImportSuccess'
import { StudentImportSummary } from '@/features/students/components/StudentImportSummary'
import type {
  StudentImportConfirmation,
  StudentImportPreview,
} from '@/features/students/types/studentImport'
import { downloadStudentCsvTemplate } from '@/features/students/utils/csvTemplate'
import {
  validateStudentImportCsv,
  validateStudentImportFile,
} from '@/features/students/utils/csvValidation'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

type ImportFlowState =
  | 'idle'
  | 'selected'
  | 'validating'
  | 'preview'
  | 'confirming'
  | 'success'

export function StudentImportPanel() {
  const navigate = useNavigate()
  const { notify } = useAuth()
  const confirmationRequestInFlight = useRef(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [flowState, setFlowState] = useState<ImportFlowState>('idle')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<StudentImportPreview | null>(null)
  const [confirmation, setConfirmation] = useState<StudentImportConfirmation | null>(null)

  const isValidating = flowState === 'validating'
  const isConfirming = flowState === 'confirming'
  const isProcessing = isValidating || isConfirming
  const canConfirm = preview !== null && preview.valid_rows > 0 && !isProcessing
  const showReview = preview !== null && flowState !== 'success'
  const showInitialSelection = !showReview && flowState !== 'success'

  function handleFileSelected(file: File) {
    const validation = validateStudentImportFile(file)

    if (!validation.isValid) {
      setSelectedFile(null)
      setValidationMessage(null)
      notify('error', validation.message ?? 'No se pudo seleccionar el archivo.')
      return
    }

    setSelectedFile(file)
    setValidationMessage(null)
    setPreview(null)
    setConfirmation(null)
    setFlowState('selected')
  }

  function clearSelection() {
    setSelectedFile(null)
    setValidationMessage(null)
    setPreview(null)
    setConfirmation(null)
    setFlowState('idle')
  }

  function handleCancel() {
    if (selectedFile || preview) {
      clearSelection()
      notify('info', 'Se cambio el archivo seleccionado.')
      return
    }

    navigate('/admin')
  }

  function handleImportAnotherFile() {
    clearSelection()
  }

  async function handleValidate() {
    if (!selectedFile) {
      notify('error', 'Selecciona un archivo CSV para continuar.')
      return
    }

    setFlowState('validating')
    setValidationMessage(null)
    setPreview(null)
    setConfirmation(null)

    try {
      const validation = await validateStudentImportCsv(selectedFile)

      if (!validation.isValid) {
        notify('error', getInvalidFileMessage())
        setFlowState('selected')
        return
      }

      const nextPreview = await previewStudentImport(selectedFile)

      setPreview(nextPreview)
      setFlowState('preview')
      setValidationMessage(buildPreviewMessage(nextPreview))

      if (nextPreview.valid_rows > 0) {
        notify('success', 'Vista previa generada correctamente.')
        return
      }

      notify('info', 'No hay estudiantes listos para importar.')
    } catch (error) {
      notify('error', getStudentImportErrorMessage(error))
      setFlowState('selected')
    }
  }

  async function handleConfirm() {
    if (!selectedFile || !canConfirm || confirmationRequestInFlight.current) {
      return
    }

    confirmationRequestInFlight.current = true
    setFlowState('confirming')

    try {
      const result = await confirmStudentImport(selectedFile)

      setConfirmation(result)
      setPreview(result)
      setFlowState('success')
      setValidationMessage(null)
      notify('success', `Importacion completada: ${result.imported_rows} estudiantes registrados.`)
    } catch (error) {
      notify('error', getStudentImportErrorMessage(error))
      setFlowState('preview')
    } finally {
      confirmationRequestInFlight.current = false
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="student-import-panel-title">
      <div className={styles.panelHeader}>
        <h2 id="student-import-panel-title">Archivo de estudiantes</h2>
        <button
          type="button"
          className={styles.templateButton}
          onClick={downloadStudentCsvTemplate}
        >
          <DownloadIcon />
          Descargar plantilla CSV
        </button>
      </div>

      {showInitialSelection ? (
        <>
          <p className={styles.columnsIntro}>
            El archivo debe incluir las siguientes columnas:
          </p>
          <ImportColumnsGuide />

          <CsvDropzone
            selectedFile={selectedFile}
            validationMessage={validationMessage}
            onFileSelected={handleFileSelected}
            onRemoveFile={clearSelection}
          />

          <div className={styles.infoBanner}>
            <InfoIcon />
            <span>Podras revisar los estudiantes antes de confirmar la importacion.</span>
          </div>

          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.continueButton}
              onClick={() => {
                void handleValidate()
              }}
              disabled={!selectedFile || isProcessing}
            >
              {getPrimaryActionLabel(flowState)}
              <ChevronRightIcon />
            </button>
          </div>
        </>
      ) : null}

      {showReview && preview ? (
        <StudentImportReview
          file={selectedFile}
          preview={preview}
          message={validationMessage}
          isConfirming={isConfirming}
          canConfirm={canConfirm}
          onChangeFile={clearSelection}
          onCancel={handleCancel}
          onConfirm={() => {
            void handleConfirm()
          }}
        />
      ) : null}

      {flowState === 'success' && confirmation ? (
        <StudentImportSuccess
          confirmation={confirmation}
          onImportAnotherFile={handleImportAnotherFile}
          onBackToPanel={() => navigate('/admin')}
        />
      ) : null}
    </section>
  )
}

function StudentImportReview({
  file,
  preview,
  message,
  isConfirming,
  canConfirm,
  onChangeFile,
  onCancel,
  onConfirm,
}: {
  file: File | null
  preview: StudentImportPreview
  message: string | null
  isConfirming: boolean
  canConfirm: boolean
  onChangeFile: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <>
      <div className={styles.selectedFileBar}>
        <div>
          <span>Archivo seleccionado</span>
          <strong>{file?.name ?? 'Archivo CSV'}</strong>
          {file ? <small>{formatFileSize(file.size)}</small> : null}
        </div>
        <button
          type="button"
          className={styles.changeFileButton}
          onClick={onChangeFile}
          disabled={isConfirming}
        >
          Cambiar archivo
        </button>
      </div>

      <div className={styles.infoBanner}>
        <InfoIcon />
        <span>Revisa los datos antes de confirmar la importacion.</span>
      </div>

      {message ? <PreviewMessage preview={preview} message={message} /> : null}
      {preview.errors.length > 0 ? <FileObservations errors={preview.errors} /> : null}

      <StudentImportSummary preview={preview} />
      <StudentImportPreviewTable rows={preview.rows} />

      <div className={styles.panelActions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={isConfirming}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.continueButton}
          onClick={onConfirm}
          disabled={!canConfirm || isConfirming}
        >
          {isConfirming ? 'Confirmando...' : 'Confirmar importacion'}
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}

function FileObservations({ errors }: { errors: string[] }) {
  return (
    <div className={styles.fileObservations} role="alert">
      <strong>Observaciones del archivo</strong>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  )
}

function PreviewMessage({
  preview,
  message,
}: {
  preview: StudentImportPreview
  message: string
}) {
  const subtext = getPreviewSubtext(preview)

  return (
    <div
      className={styles.reviewMessage}
      data-tone={preview.valid_rows === 0 ? 'warning' : preview.error_rows > 0 ? 'mixed' : 'ready'}
      role={preview.valid_rows === 0 || preview.error_rows > 0 ? 'alert' : 'status'}
    >
      <strong>{message}</strong>
      <span>{subtext}</span>
    </div>
  )
}

function getPreviewSubtext(preview: StudentImportPreview): string {
  if (preview.valid_rows === 0) {
    return 'Corrige las observaciones del archivo y vuelve a intentarlo.'
  }

  if (preview.error_rows > 0) {
    return 'Los registros listos podran importarse; los registros con observaciones no seran registrados.'
  }

  return 'Revisa la informacion antes de confirmar la importacion.'
}

function buildPreviewMessage(preview: StudentImportPreview): string {
  if (preview.valid_rows === 0) {
    return 'No hay estudiantes listos para importar.'
  }

  if (preview.error_rows > 0) {
    return 'Algunos registros necesitan revision.'
  }

  return 'Todos los estudiantes estan listos para ser importados.'
}

function getInvalidFileMessage(): string {
  return 'No pudimos procesar este archivo. Verifica que utilice la plantilla CSV indicada e intentalo nuevamente.'
}

function getPrimaryActionLabel(flowState: ImportFlowState): string {
  switch (flowState) {
    case 'validating':
      return 'Validando...'
    case 'confirming':
      return 'Confirmando...'
    case 'success':
      return 'Importacion completada'
    default:
      return 'Validar y continuar'
  }
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }

  const kilobytes = size / 1024

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
