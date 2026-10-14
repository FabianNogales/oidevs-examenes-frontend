import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  createAcademicTerm,
  editAcademicTerm,
  mapAcademicTermMutationError,
} from '../api/academicTermMutationsApi'
import type {
  AcademicTerm,
  AcademicTermFieldErrors,
  CreateAcademicTermPayload,
} from '../types/academicTerm.types'
import { validateAcademicTerm } from '../utils/academicTermValidation'
import { formatAcademicTermDate } from '../utils/academicTermDate'
import { AcademicTermFields } from './AcademicTermFields'
import styles from './AcademicTermModal.module.css'

export function AcademicTermForm({
  term,
  onCancel,
  onSaved,
  onBusyChange,
}: {
  term?: AcademicTerm
  onCancel: () => void
  onSaved: (term: AcademicTerm) => void
  onBusyChange: (value: boolean) => void
}) {
  const [values, setValues] = useState<CreateAcademicTermPayload>(() => ({
    name: term?.name ?? '',
    start_date: term?.start_date ?? '',
    end_date: term?.end_date ?? '',
    status: term?.status ?? 'INACTIVE',
  }))
  const [errors, setErrors] = useState<AcademicTermFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<AcademicTerm | null>(null)
  const [saving, setSaving] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(true)
  const form = useRef<HTMLFormElement>(null)
  const id = useId()
  useEffect(() => {
    mounted.current = true
    form.current?.querySelector<HTMLInputElement>('[name="name"]')?.focus()
    return () => {
      mounted.current = false
    }
  }, [])
  function change(field: keyof CreateAcademicTermPayload, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setError(null)
    setConflict(null)
  }
  function focusError(fields: AcademicTermFieldErrors) {
    const field = (['name', 'start_date', 'end_date', 'status'] as const).find(
      (key) => fields[key],
    )
    if (field)
      form.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus()
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || unavailable) return
    const payload = { ...values, name: values.name.trim() }
    const validation = validateAcademicTerm(payload)
    setErrors(validation)
    setError(null)
    setConflict(null)
    if (Object.keys(validation).length) {
      focusError(validation)
      return
    }
    pending.current = true
    setSaving(true)
    onBusyChange(true)
    try {
      const saved = term
        ? await editAcademicTerm(term.id, payload)
        : await createAcademicTerm(payload)
      if (mounted.current) onSaved(saved)
    } catch (cause) {
      if (!mounted.current) return
      const apiError = mapAcademicTermMutationError(cause)
      setErrors(apiError.fieldErrors)
      setError(apiError.message)
      setConflict(apiError.conflictingPeriod)
      if (apiError.status === 403 || apiError.status === 404)
        setUnavailable(true)
      requestAnimationFrame(() => focusError(apiError.fieldErrors))
    } finally {
      pending.current = false
      if (mounted.current) {
        setSaving(false)
        onBusyChange(false)
      }
    }
  }
  return (
    <form ref={form} noValidate onSubmit={submit} aria-busy={saving}>
      <p className={styles.help}>
        Los campos con * son obligatorios. Las fechas no pueden coincidir con
        otro periodo, aunque esté inactivo.
      </p>
      {term && (
        <p className={styles.help}>
          La edición conserva el estado actual:{' '}
          <strong>{term.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</strong>.
        </p>
      )}
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          {conflict && (
            <p>
              Periodo en conflicto: <strong>{conflict.name}</strong> (
              {formatAcademicTermDate(conflict.start_date)} -{' '}
              {formatAcademicTermDate(conflict.end_date)}).
            </p>
          )}
        </div>
      )}
      <AcademicTermFields
        id={id}
        values={values}
        errors={errors}
        editing={Boolean(term)}
        disabled={saving || unavailable}
        onChange={change}
      />
      <footer className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={saving || unavailable}
        >
          {saving
            ? 'Guardando…'
            : term
              ? 'Guardar cambios'
              : 'Registrar periodo'}
        </button>
      </footer>
    </form>
  )
}
