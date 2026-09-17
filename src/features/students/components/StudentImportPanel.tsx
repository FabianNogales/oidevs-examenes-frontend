import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { CsvDropzone } from '@/features/students/components/CsvDropzone'
import { ImportColumnsGuide } from '@/features/students/components/ImportColumnsGuide'
import { downloadStudentCsvTemplate } from '@/features/students/utils/csvTemplate'
import {
  validateStudentImportCsv,
  validateStudentImportFile,
} from '@/features/students/utils/csvValidation'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'

export function StudentImportPanel() {
  const navigate = useNavigate()
  const { notify } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

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
  }

  function clearSelection() {
    setSelectedFile(null)
    setValidationMessage(null)
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

    setIsValidating(true)
    setValidationMessage(null)

    try {
      const validation = await validateStudentImportCsv(selectedFile)

      if (!validation.isValid) {
        notify('error', validation.message ?? 'El CSV no es valido.')
        return
      }

      setValidationMessage(
        'Archivo validado localmente. La previsualizacion se conectara cuando exista el backend HU05.',
      )
      notify('success', 'El archivo CSV cumple la estructura esperada.')
    } catch {
      notify('error', 'No se pudo leer el archivo CSV.')
    } finally {
      setIsValidating(false)
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
        <span>Podras revisar los datos antes de confirmar la importacion.</span>
      </div>

      <div className={styles.panelActions}>
        <button
          type="button"
          className={styles.cancelButton}
          onClick={handleCancel}
          disabled={isValidating}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.continueButton}
          onClick={() => {
            void handleValidate()
          }}
          disabled={!selectedFile || isValidating}
        >
          {isValidating ? 'Validando...' : 'Validar y continuar'}
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  )
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
