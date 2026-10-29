import { useEffect, useRef, useState } from 'react'
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'
import styles from './AddStudentsModal.module.css'
import local from './ManualStudentEnrollmentDialog.module.css'

export function ManualStudentEnrollmentDialog({
  subjectName,
  onClose,
  onSubmit,
}: {
  subjectName: string
  onClose: () => void
  onSubmit: (sis: string) => Promise<void>
}) {
  const [sis, setSis] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const busy = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  useBodyScrollLock(true)
  useEffect(() => {
    const element = dialog.current
    const previous = document.activeElement
    element?.showModal()
    input.current?.focus()
    return () => {
      element?.close()
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus()
    }
  }, [])
  function close() {
    if (!busy.current) onClose()
  }
  async function submit() {
    if (busy.current) return
    if (!sis.trim()) {
      setError('Debes ingresar un SIS válido.')
      return
    }
    busy.current = true
    setProcessing(true)
    setError(null)
    try {
      await onSubmit(sis.trim())
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo agregar el estudiante.',
      )
    } finally {
      busy.current = false
      setProcessing(false)
    }
  }
  return (
    <dialog
      ref={dialog}
      className={local.dialog}
      aria-labelledby="manual-student-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Materia</p>
          <h2 id="manual-student-title">Agregar estudiante manualmente</h2>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Cerrar modal"
          disabled={processing}
          onClick={close}
        >
          ×
        </button>
      </header>
      <p className={styles.subjectName}>{subjectName}</p>
      <form
        className={styles.tabPanel}
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className={styles.fieldLabel} htmlFor="student-sis">
          SIS
        </label>
        <input
          ref={input}
          id="student-sis"
          className={styles.input}
          inputMode="numeric"
          value={sis}
          onChange={(event) => setSis(event.target.value)}
          disabled={processing}
          placeholder="Ingrese el SIS"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'student-sis-error' : undefined}
        />
        {error && (
          <p id="student-sis-error" className={styles.inlineError} role="alert">
            {error}
          </p>
        )}
        <footer className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={processing}
            onClick={close}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={processing}
          >
            {processing ? 'Agregando…' : 'Agregar estudiante'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
