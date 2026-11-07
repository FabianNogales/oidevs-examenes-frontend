import { useRef, useState } from 'react'
import { Button } from '@/shared/components/ui/Button/Button'
import styles from './AddStudentsModal.module.css'
import { StudentDialog } from './StudentDialog'

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
  const input = useRef<HTMLInputElement>(null)
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
    <StudentDialog
      title="Agregar estudiante manualmente"
      kicker="Materia"
      subtitle={subjectName}
      busy={processing}
      initialFocus={input}
      onClose={close}
    >
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
          <Button variant="secondary" disabled={processing} onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" disabled={processing}>
            {processing ? 'Agregando…' : 'Agregar estudiante'}
          </Button>
        </footer>
      </form>
    </StudentDialog>
  )
}
