import { useRef, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router' // Añadir useLocation
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
  StudentImportColumn,
  StudentImportConfirmation,
  StudentImportPreview,
} from '@/features/students/types/studentImport'
import { downloadStudentCsvTemplate } from '@/features/students/utils/csvTemplate'
import {
  validateStudentImportCsv,
  validateStudentImportFile,
} from '@/features/students/utils/csvValidation'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

type ImportFlowState = 'idle' | 'selected' | 'validating' | 'preview' | 'confirming' | 'success'

export type ImportStep = 'select' | 'preview' | 'success'

type RowFilter = 'all' | 'valid' | 'invalid'

const IMPORT_STORAGE_KEY = 'eida_last_import_preview'
const STUDENTS_PATH = '/admin/students'
const PAGE_SIZE = 10
const EXPORT_COLUMNS: StudentImportColumn[] = [
  'sis_code',
  'identity_number',
  'first_names',
  'last_names',
  'email',
  'career',
  'profile_photo',
]

function readSavedPreview(): StudentImportPreview | null {
  try {
    const saved = localStorage.getItem(IMPORT_STORAGE_KEY)
    return saved ? (JSON.parse(saved) as StudentImportPreview) : null
  } catch {
    localStorage.removeItem(IMPORT_STORAGE_KEY)
    return null
  }
}

function toStep(flowState: ImportFlowState): ImportStep {
  if (flowState === 'success') return 'success'
  if (flowState === 'preview' || flowState === 'confirming') return 'preview'
  return 'select'
}

export function StudentImportPanel({
  onStepChange,
}: {
  onStepChange?: (step: ImportStep) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useAuth()
  const isNewView = location.state?.view === 'new'
  const confirmationRequestInFlight = useRef(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<StudentImportConfirmation | null>(null)
  const [preview, setPreview] = useState<StudentImportPreview | null>(() =>
    isNewView ? null : readSavedPreview()
  )
  const [flowState, setFlowState] = useState<ImportFlowState>(() =>
    (!isNewView && readSavedPreview()) ? 'preview' : 'idle',
  )
  useEffect(() => {
    if (preview && flowState !== 'success') {
      localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(preview))
    }
  }, [preview, flowState])

  useEffect(() => {
    onStepChange?.(toStep(flowState))
  }, [flowState, onStepChange])

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
      notify('info', 'Se cambió el archivo seleccionado.')
      return
    }
    navigate(STUDENTS_PATH)
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
      setPreview(result as any)
      setFlowState('success')
      setValidationMessage(null)
      localStorage.removeItem(IMPORT_STORAGE_KEY)

      notify('success', `Importación completada: ${result.imported_rows} estudiantes registrados.`)
    } catch (error) {
      notify('error', getStudentImportErrorMessage(error))
      setFlowState('preview')
    } finally {
      confirmationRequestInFlight.current = false
    }
  }

  return (
    <section className={styles.panel} aria-label="Archivo de estudiantes">
      {showInitialSelection ? (
        <>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeading}>
              <h2 className={styles.panelTitle}>Archivo de estudiantes</h2>
              <p className={styles.columnsIntro}>El archivo debe incluir las siguientes columnas:</p>
            </div>
            <button
              type="button"
              className={styles.templateButton}
              onClick={downloadStudentCsvTemplate}
            >
              <DownloadIcon />
              Descargar plantilla CSV
            </button>
          </div>

          <ImportColumnsGuide />
          <CsvDropzone
            selectedFile={selectedFile}
            validationMessage={validationMessage}
            onFileSelected={handleFileSelected}
            onRemoveFile={clearSelection}
          />
          <div className={styles.infoBanner}>
            <InfoIcon />
            <span>Podrás revisar los estudiantes antes de confirmar la importación.</span>
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
              onClick={() => { void handleValidate() }}
              disabled={!selectedFile || isProcessing}
            >
              {getPrimaryActionLabel(flowState)}
              <ArrowRightIcon />
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
          onConfirm={() => { void handleConfirm() }}
        />
      ) : null}

      {flowState === 'success' && confirmation ? (
        <StudentImportSuccess
          confirmation={confirmation}
          onImportAnotherFile={handleImportAnotherFile}
          onBackToPanel={() => navigate(STUDENTS_PATH)}
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
  const [filter, setFilter] = useState<RowFilter>('all')
  const [page, setPage] = useState(1)

  const filteredRows = preview.rows.filter((row) => {
    if (filter === 'valid') return row.valid === true
    if (filter === 'invalid') return row.valid === false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE)

  function handleFilterChange(next: RowFilter) {
    setFilter(next)
    setPage(1)
  }

  return (
    <>
      <h2 className={styles.panelTitle}>Archivo de estudiantes</h2>

      <div className={styles.selectedFileBar}>
        <div>
          <span>Archivo seleccionado</span>
          <strong>{file?.name ?? 'Archivo recuperado (sesión anterior)'}</strong>
          {file ? <small>{formatFileSize(file.size)}</small> : null}
        </div>
        <button
          type="button"
          className={styles.changeFileButton}
          onClick={onChangeFile}
          disabled={isConfirming}
        >
          <FileIcon />
          Cambiar archivo
        </button>
      </div>

      <div className={styles.infoBanner}>
        <InfoIcon />
        <span>Revisa los datos antes de confirmar la importación.</span>
      </div>

      {message ? <PreviewMessage preview={preview} message={message} /> : null}
      {preview.errors.length > 0 ? <FileObservations errors={preview.errors} /> : null}

      <StudentImportSummary
        preview={preview}
        currentFilter={filter}
        onFilterChange={handleFilterChange}
      />

      {pageRows.length > 0 ? (
        <StudentImportPreviewTable rows={pageRows} />
      ) : (
        <p className={styles.emptyRows}>No hay registros para este filtro.</p>
      )}

      <div className={styles.tablePager}>
        <span className={styles.pagerSummary}>
          {filteredRows.length === 0
            ? 'Mostrando 0 estudiantes'
            : `Mostrando ${pageStart + 1} a ${pageStart + pageRows.length} de ${filteredRows.length} estudiantes`}
        </span>
        {totalPages > 1 ? (
          <div className={styles.pagerControls}>
            <button
              type="button"
              className={styles.pagerButton}
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Anterior
            </button>
            <span className={styles.pagerPage}>Página {currentPage} de {totalPages}</span>
            <button
              type="button"
              className={styles.pagerButton}
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.reviewActions}>
        <button
          type="button"
          className={styles.downloadViewButton}
          onClick={() => downloadCurrentView(filteredRows)}
          disabled={filteredRows.length === 0}
        >
          <DownloadIcon />
          Descargar vista actual CSV
        </button>
        <div className={styles.reviewActionsRight}>
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
            className={`${styles.continueButton} ${styles.confirmButton}`}
            onClick={onConfirm}
            disabled={!canConfirm || isConfirming || !file}
          >
            {isConfirming ? 'Confirmando...' : 'Confirmar importación'}
            <ArrowRightIcon />
          </button>
        </div>
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

function PreviewMessage({ preview, message }: { preview: StudentImportPreview; message: string }) {
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
  if (preview.valid_rows === 0) return 'Corrige las observaciones del archivo y vuelve a intentarlo.'
  if (preview.error_rows > 0) {
    return 'Los registros listos podrán importarse; los registros con observaciones no serán registrados.'
  }
  return 'Revisa la información antes de confirmar la importación.'
}

function buildPreviewMessage(preview: StudentImportPreview): string {
  if (preview.valid_rows === 0) return 'No hay estudiantes listos para importar.'
  if (preview.error_rows > 0) return 'Algunos registros necesitan revisión.'
  return 'Todos los estudiantes están listos para ser importados.'
}

function getInvalidFileMessage(): string {
  return 'No pudimos procesar este archivo. Verifica que utilice la plantilla CSV indicada e inténtalo nuevamente.'
}

function getPrimaryActionLabel(flowState: ImportFlowState): string {
  switch (flowState) {
    case 'validating': return 'Validando...'
    case 'confirming': return 'Confirmando...'
    case 'success': return 'Importación completada'
    default: return 'Validar y continuar'
  }
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`
  const kilobytes = size / 1024
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`
  return `${(kilobytes / 1024).toFixed(1)} MB`
}

function downloadCurrentView(rows: StudentImportPreview['rows']) {
  const escape = (value: unknown) => {
    const text = value == null ? '' : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [EXPORT_COLUMNS.join(',')]
  for (const row of rows) {
    lines.push(EXPORT_COLUMNS.map((column) => escape(row.data[column])).join(','))
  }
  const blob = new Blob(['\uFEFF' + lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'vista_actual_estudiantes.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" /><path d="M9 13h6" /><path d="M9 17h6" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  )
}