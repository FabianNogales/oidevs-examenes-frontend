import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { CsvImportSummary } from '@/features/students/types/student.types'

import styles from './AddStudentsModal.module.css'

interface AddStudentsModalProps {
  isOpen: boolean
  subjectName: string
  onClose: () => void
  onManualSubmit: (sis: string) => Promise<void>
  onCsvSubmit: (file: File) => Promise<CsvImportSummary>
}

export function AddStudentsModal({
  isOpen,
  subjectName,
  onClose,
  onManualSubmit,
  onCsvSubmit,
}: AddStudentsModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual')
  const [sis, setSis] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvSummary, setCsvSummary] = useState<CsvImportSummary | null>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  const resetModalState = () => {
    setActiveTab('manual')
    setSis('')
    setFile(null)
    setManualError(null)
    setCsvError(null)
    setCsvSummary(null)
    setIsProcessing(false)
  }

  const acceptedFileTypes = useMemo(
    () => '.csv, text/csv, application/vnd.ms-excel',
    [],
  )

  const closeWithoutProcessing = useCallback(() => {
    if (!isProcessing) {
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
    requestAnimationFrame(() => firstInputRef.current?.focus())

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isProcessing, closeWithoutProcessing])

  async function submitManual() {
    const normalizedSis = sis.trim()
    if (!normalizedSis) {
      setManualError('Debes ingresar un SIS válido.')
      return
    }

    if (!/^\d{9,}$/.test(normalizedSis)) {
      setManualError('El SIS debe contener solo números y tener al menos 9 dígitos.')
      return
    }

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
      setIsProcessing(false)
    }
  }

  async function submitCsv() {
    if (!file) {
      setCsvError('Selecciona un archivo CSV para continuar.')
      return
    }

    setIsProcessing(true)
    setCsvError(null)
    setCsvSummary(null)

    try {
      const summary = await onCsvSubmit(file)
      setCsvSummary(summary)
      setFile(null)
    } catch (error) {
      setCsvError(
        error instanceof Error
          ? error.message
          : 'No se pudo procesar el archivo CSV.',
      )
    } finally {
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

        {activeTab === 'manual' ? (
          <div className={styles.tabPanel}>
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
              onChange={(event) => setSis(event.target.value.replace(/\D/g, ''))}
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
              <button type="button" className={styles.primaryButton} onClick={() => void submitManual()} disabled={isProcessing}>
                {isProcessing ? 'Procesando…' : 'Agregar'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.tabPanel}>
            <label className={styles.fieldLabel} htmlFor="csv-upload">
              Archivo CSV
            </label>
            <input
              id="csv-upload"
              className={styles.fileInput}
              type="file"
              accept={acceptedFileTypes}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={isProcessing}
            />

            {csvError ? (
              <p className={styles.inlineError} role="alert">{csvError}</p>
            ) : null}

            {csvSummary ? (
              <div className={styles.summaryBox} role="status">
                <h3>Resumen de importación</h3>
                <ul>
                  <li>Válidos / inscritos: <strong>{csvSummary.validCount}</strong></li>
                  <li>Duplicados: <strong>{csvSummary.duplicateCount}</strong></li>
                  <li>Errores: <strong>{csvSummary.errorCount}</strong></li>
                </ul>
                {csvSummary.issues.length > 0 ? (
                  <div className={styles.issueList}>
                    {csvSummary.issues.map((issue) => (
                      <div key={`${issue.row}-${issue.sis || 'empty'}`} className={styles.issueItem}>
                        <span>Fila {issue.row}</span>
                        <span>{issue.sis ? issue.sis : 'Vacía'}</span>
                        <span>{issue.reason}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={closeWithoutProcessing} disabled={isProcessing}>
                Cancelar
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => void submitCsv()} disabled={isProcessing || !file}>
                {isProcessing ? 'Procesando…' : 'Importar CSV'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
