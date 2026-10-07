import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { CsvImportSummary } from '@/features/students/types/student.types'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import { importStatusLabel, translateVisibleMessage } from '@/shared/api/visibleMessage'

import styles from './AddStudentsModal.module.css'

interface AddStudentsModalProps {
  isOpen: boolean
  subjectName: string
  onClose: () => void
  onManualSubmit: (sis: string) => Promise<void>
  onCsvSubmit: (file: File) => Promise<CsvImportSummary>
  onCsvPreview: (file: File) => Promise<CsvImportSummary>
}

export function AddStudentsModal({
  isOpen,
  subjectName,
  onClose,
  onManualSubmit,
  onCsvSubmit,
  onCsvPreview,
}: AddStudentsModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual')
  const [sis, setSis] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvSummary, setCsvSummary] = useState<CsvImportSummary | null>(null)
  const [csvConfirmed, setCsvConfirmed] = useState(false)
  useBodyScrollLock(isOpen)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingRef = useRef(false)

  const resetModalState = () => {
    setActiveTab('manual')
    setSis('')
    setFile(null)
    setManualError(null)
    setCsvError(null)
    setCsvSummary(null)
    setCsvConfirmed(false)
    setIsProcessing(false)
  }

  const acceptedFileTypes = useMemo(
    () => '.csv, text/csv, application/vnd.ms-excel',
    [],
  )

  const closeWithoutProcessing = useCallback(() => {
    if (!isProcessing && !processingRef.current) {
      onClose()
      resetModalState()
    }
  }, [isProcessing, onClose])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing) {
        closeWithoutProcessing()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const frame = requestAnimationFrame(() => firstInputRef.current?.focus())

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(frame)
    }
  }, [isOpen, isProcessing, closeWithoutProcessing])

  async function submitManual() {
    if (processingRef.current) return
    const normalizedSis = sis.trim()
    if (!normalizedSis) {
      setManualError('Debes ingresar un SIS válido.')
      return
    }

    processingRef.current = true
    setIsProcessing(true)
    setManualError(null)

    try {
      await onManualSubmit(normalizedSis)
      setSis('')
    } catch (error) {
      setManualError(
        error instanceof Error
          ? error.message
          : 'No se pudo agregar el estudiante.',
      )
    } finally {
      processingRef.current = false
      setIsProcessing(false)
    }
  }

  async function submitCsv(confirm: boolean) {
    if (processingRef.current) return
    if (!file) {
      setCsvError('Selecciona un archivo CSV para continuar.')
      return
    }

    processingRef.current = true
    setIsProcessing(true)
    setCsvError(null)
    setCsvSummary(null)

    try {
      const summary = await (confirm ? onCsvSubmit(file) : onCsvPreview(file))
      setCsvSummary(summary)
      setCsvConfirmed(confirm)
      if (confirm) {
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (error) {
      setCsvError(
        error instanceof Error
          ? error.message
          : 'No se pudo procesar el archivo CSV.',
      )
    } finally {
      processingRef.current = false
      setIsProcessing(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className={styles.overlay} aria-modal="true" role="dialog" aria-labelledby="add-students-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Materia</p>
            <h2 id="add-students-title">Agregar estudiantes</h2>
          </div>
          <button type="button" className={styles.closeButton} aria-label="Cerrar modal" onClick={closeWithoutProcessing} disabled={isProcessing}>
            ×
          </button>
        </div>

        <p className={styles.subjectName}>{subjectName}</p>

        <div className={styles.tabGroup} role="tablist" aria-label="Agregar estudiantes">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'manual'}
            className={`${styles.tabButton} ${activeTab === 'manual' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('manual')}
            disabled={isProcessing}
          >
            Agregar manualmente
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'csv'}
            className={`${styles.tabButton} ${activeTab === 'csv' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('csv')}
            disabled={isProcessing}
          >
            Importar CSV
          </button>
        </div>

        {isProcessing ? (
          <div className={styles.processing} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            Procesando…
          </div>
        ) : null}

        {activeTab === 'manual' ? (
          <form className={styles.tabPanel} onSubmit={(event) => { event.preventDefault(); void submitManual() }}>
            <label className={styles.fieldLabel} htmlFor="student-sis">
              SIS
            </label>
            <input
              id="student-sis"
              ref={firstInputRef}
              className={styles.input}
              type="text"
              inputMode="numeric"
              value={sis}
              onChange={(event) => setSis(event.target.value)}
              placeholder="Ingrese el SIS"
              disabled={isProcessing}
            />

            {manualError ? (
              <p className={styles.inlineError} role="alert">{manualError}</p>
            ) : null}

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={closeWithoutProcessing} disabled={isProcessing}>
                Cancelar
              </button>
              <button type="submit" className={styles.primaryButton} disabled={isProcessing}>
                {isProcessing ? 'Procesando…' : 'Agregar'}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.tabPanel}>
            <p id="csv-guide">Selecciona un archivo .csv con la columna <strong>sisCode</strong>. La vista previa valida los registros sin agregar estudiantes. Solo «Confirmar importación» guarda las inscripciones.</p>
            <pre className={styles.csvExample}>{'sisCode\n202600001\n202600002'}</pre>
            <label className={styles.filePicker} htmlFor="csv-upload">
              Seleccionar archivo CSV
            </label>
            <input
              id="csv-upload"
              ref={fileInputRef}
              aria-describedby="csv-guide"
              className={styles.fileInput}
              type="file"
              accept={acceptedFileTypes}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null)
                setCsvSummary(null)
                setCsvConfirmed(false)
                setCsvError(null)
              }}
              disabled={isProcessing}
            />
            <span>{file?.name ?? 'Ningún archivo seleccionado'}</span>

            {csvError ? (
              <p className={styles.inlineError} role="alert">{csvError}</p>
            ) : null}

            {csvSummary ? (
              <div className={styles.summaryBox} role="status">
                <h3>{csvConfirmed ? 'Resultado de importación' : 'Vista previa: aún no se guardaron inscripciones'}</h3>
                <ul>
                  {csvSummary.totalProcessed != null ? (
                    <li>Total procesados: <strong>{csvSummary.totalProcessed}</strong></li>
                  ) : null}
                  <li>{csvConfirmed ? 'Agregados' : 'Listos para importar'}: <strong>{csvSummary.validCount}</strong></li>
                  <li>
                    Duplicados:{' '}
                    <strong>{csvSummary.duplicateCount ?? 'No informado'}</strong>
                  </li>
                  <li>Errores: <strong>{csvSummary.errorCount}</strong></li>
                </ul>
                {(csvSummary.records ?? csvSummary.issues).length > 0 ? (
                  <div className={styles.issueList}>
                    {(csvSummary.records ?? csvSummary.issues).map((issue) => (
                      <div key={`${issue.row}-${issue.sis || 'empty'}`} className={styles.issueItem}>
                        <span>Fila {issue.row}</span>
                        <span>{issue.sis ? `SIS ${issue.sis}` : 'Sin SIS'}</span>
                        <span>
                          {issue.status ? `${importStatusLabel(issue.status)}: ` : ''}
                          {translateVisibleMessage(issue.reason)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={closeWithoutProcessing} disabled={isProcessing}>
                {csvConfirmed ? 'Cerrar' : 'Cancelar'}
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => void submitCsv(Boolean(csvSummary))} disabled={isProcessing || !file || (csvSummary !== null && csvSummary.validCount === 0)}>
                {isProcessing ? 'Procesando…' : csvSummary ? 'Confirmar importación' : 'Previsualizar CSV'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
