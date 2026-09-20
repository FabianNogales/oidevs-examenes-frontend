import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  confirmStudentImport,
  getStudentImportErrorMessage,
  previewStudentImport,
} from '@/features/students/api/studentImportApi'
import { CsvDropzone } from '@/features/students/components/CsvDropzone'
import { ImportColumnsGuide } from '@/features/students/components/ImportColumnsGuide'
import type {
  StudentImportConfirmation,
  StudentImportPreview,
  StudentImportPreviewRow,
} from '@/features/students/types/studentImport'
import { downloadStudentCsvTemplate } from '@/features/students/utils/csvTemplate'
import {
  validateStudentImportCsv,
  validateStudentImportFile,
} from '@/features/students/utils/csvValidation'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

type ImportFlowState = 'idle' | 'validating' | 'preview' | 'confirming' | 'success'

export function StudentImportPanel() {
  const navigate = useNavigate()
  const { notify } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [flowState, setFlowState] = useState<ImportFlowState>('idle')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<StudentImportPreview | null>(null)
  const [confirmation, setConfirmation] = useState<StudentImportConfirmation | null>(null)

  const isValidating = flowState === 'validating'
  const isConfirming = flowState === 'confirming'
  const isProcessing = isValidating || isConfirming
  const canConfirm = preview !== null && preview.valid_rows > 0 && !isProcessing

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
    setFlowState('idle')
  }

  function clearSelection() {
    setSelectedFile(null)
    setValidationMessage(null)
    setPreview(null)
    setConfirmation(null)
    setFlowState('idle')
  }

  function handleCancel() {
    if (selectedFile) {
      clearSelection()
      notify('info', 'Se quito el archivo seleccionado.')
      return
    }

    navigate('/admin')
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
        notify('error', validation.message ?? 'El CSV no es valido.')
        setFlowState('idle')
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

      notify('error', 'El archivo no tiene filas validas para importar.')
    } catch (error) {
      notify('error', getStudentImportErrorMessage(error))
      setFlowState('idle')
    }
  }

  async function handleConfirm() {
    if (!selectedFile || !canConfirm) {
      return
    }

    setFlowState('confirming')

    try {
      const result = await confirmStudentImport(selectedFile)

      setConfirmation(result)
      setPreview(result)
      setFlowState('success')
      setValidationMessage('Importacion procesada por el backend.')
      notify('success', `Importacion procesada: ${result.imported_rows} estudiantes creados.`)
    } catch (error) {
      notify('error', getStudentImportErrorMessage(error))
      setFlowState('preview')
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
        <span>Podras revisar los datos reales del backend antes de confirmar la importacion.</span>
      </div>

      {preview ? (
        <StudentImportPreviewResult
          preview={preview}
          confirmation={confirmation}
        />
      ) : null}

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
            if (flowState === 'preview') {
              void handleConfirm()
              return
            }

            void handleValidate()
          }}
          disabled={
            !selectedFile ||
            isProcessing ||
            (flowState === 'preview' && !canConfirm) ||
            flowState === 'success'
          }
        >
          {getPrimaryActionLabel(flowState)}
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  )
}

function StudentImportPreviewResult({
  preview,
  confirmation,
}: {
  preview: StudentImportPreview
  confirmation: StudentImportConfirmation | null
}) {
  const rowsWithErrors = preview.rows.filter((row) => !row.valid)

  return (
    <section className={styles.previewPanel} aria-live="polite">
      <div className={styles.previewSummary}>
        <SummaryItem label="Total" value={preview.total_rows} />
        <SummaryItem label="Validas" value={preview.valid_rows} />
        <SummaryItem label="Con errores" value={preview.error_rows} />
        {confirmation ? (
          <>
            <SummaryItem label="Importadas" value={confirmation.imported_rows} />
            <SummaryItem label="Fallidas" value={confirmation.failed_rows} />
          </>
        ) : null}
      </div>

      {preview.errors.length > 0 ? (
        <div className={styles.importErrors} role="alert">
          {preview.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      {rowsWithErrors.length > 0 ? (
        <div className={styles.rowErrors}>
          <h3>Filas con observaciones</h3>
          <div className={styles.rowErrorList}>
            {rowsWithErrors.map((row) => (
              <RowErrorItem key={row.row} row={row} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function RowErrorItem({ row }: { row: StudentImportPreviewRow }) {
  const displayValue =
    row.data.sis_code ||
    row.data.identity_number ||
    row.data.email ||
    'Sin identificador'

  return (
    <article className={styles.rowErrorItem}>
      <div>
        <strong>Fila {row.row}</strong>
        <span>{displayValue}</span>
      </div>
      <ul>
        {row.errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </article>
  )
}

function buildPreviewMessage(preview: StudentImportPreview): string {
  if (preview.valid_rows === 0) {
    return 'El backend no encontro filas validas para importar.'
  }

  if (preview.error_rows > 0) {
    return 'El backend encontro filas validas y filas con observaciones.'
  }

  return 'El backend valido todas las filas del archivo.'
}

function getPrimaryActionLabel(flowState: ImportFlowState): string {
  switch (flowState) {
    case 'validating':
      return 'Validando...'
    case 'preview':
      return 'Confirmar importacion'
    case 'confirming':
      return 'Confirmando...'
    case 'success':
      return 'Importacion procesada'
    default:
      return 'Validar y continuar'
  }
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
