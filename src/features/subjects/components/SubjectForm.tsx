import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { mapSubjectError, saveAdminSubject } from '../api/subjectMutationsApi'
import { useSubjectCareers } from '../hooks/useAdminSubjects'
import type {
  AdminSubject,
  SubjectFieldErrors,
  SubjectPayload,
} from '../types/adminSubject.types'
import { validateSubject } from '../utils/subjectValidation'
import { SubjectCareerSelector } from './SubjectCareerSelector'
import styles from './SubjectDialog.module.css'

export function SubjectForm({
  subject,
  onCancel,
  onSaved,
  onBusyChange,
}: {
  subject?: AdminSubject
  onCancel: () => void
  onSaved: (subject: AdminSubject) => void
  onBusyChange: (busy: boolean) => void
}) {
  const [values, setValues] = useState<SubjectPayload>(() => ({
    code: subject?.code ?? '',
    name: subject?.name ?? '',
    career_ids: subject?.careers.map((career) => career.id) ?? [],
  }))
  const [errors, setErrors] = useState<SubjectFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const pending = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const id = useId()
  const careers = useSubjectCareers()
  // Preserve historical associations even if absent from the current career catalog.
  const options = [
    ...careers.careers,
    ...(subject?.careers.filter(
      (career) => !careers.careers.some((item) => item.id === career.id),
    ) ?? []),
  ]
  const originalIds = new Set(subject?.careers.map((career) => career.id) ?? [])
  useEffect(() => {
    form.current?.querySelector<HTMLInputElement>('[name="code"]')?.focus()
  }, [])
  function change(field: keyof SubjectPayload, value: string | number[]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setError(null)
  }
  function focusError(fields: SubjectFieldErrors) {
    const field = (['code', 'name', 'career_ids'] as const).find(
      (key) => fields[key],
    )
    if (field)
      form.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus()
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || unavailable || !careers.loaded || careers.error)
      return
    const payload = {
      ...values,
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      career_ids: [...new Set(values.career_ids)],
    }
    const validation = validateSubject(payload)
    if (
      payload.career_ids.some(
        (selected) =>
          !options.some(
            (career) =>
              career.id === selected &&
              (career.status === 'ACTIVE' || originalIds.has(selected)),
          ),
      )
    )
      validation.career_ids =
        'Selecciona carreras activas para las nuevas asociaciones.'
    setErrors(validation)
    setError(null)
    if (Object.keys(validation).length) {
      focusError(validation)
      return
    }
    pending.current = true
    setSaving(true)
    onBusyChange(true)
    try {
      onSaved(await saveAdminSubject(payload, subject?.id))
    } catch (cause) {
      const apiError = mapSubjectError(cause)
      setErrors(apiError.fieldErrors)
      setError(apiError.message)
      if (apiError.status === 404 || apiError.status === 403)
        setUnavailable(true)
      requestAnimationFrame(() => focusError(apiError.fieldErrors))
    } finally {
      pending.current = false
      setSaving(false)
      onBusyChange(false)
    }
  }
  return (
    <form ref={form} noValidate onSubmit={submit} aria-busy={saving}>
      <p className={styles.help}>
        Los campos con * son obligatorios. Una materia puede pertenecer a varias
        carreras.
      </p>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <div className={styles.formGrid}>
        {(['code', 'name'] as const).map((field) => (
          <div className={styles.field} key={field}>
            <label htmlFor={`${id}-${field}`}>
              {field === 'code' ? 'Código' : 'Nombre'} *
            </label>
            <input
              id={`${id}-${field}`}
              name={field}
              required
              maxLength={field === 'code' ? 50 : 255}
              value={values[field]}
              disabled={saving || unavailable}
              aria-invalid={Boolean(errors[field])}
              aria-describedby={`${id}-${field}-help ${errors[field] ? `${id}-${field}-error` : ''}`}
              onChange={(event) => change(field, event.target.value)}
            />
            <small id={`${id}-${field}-help`}>
              {field === 'code'
                ? 'Código único. Se guardará en mayúsculas.'
                : 'Nombre académico de la materia.'}
            </small>
            {errors[field] && (
              <small className={styles.fieldError} id={`${id}-${field}-error`}>
                {errors[field]}
              </small>
            )}
          </div>
        ))}
        <SubjectCareerSelector
          id={id}
          options={options}
          originalIds={originalIds}
          selected={values.career_ids}
          loaded={careers.loaded}
          error={errors.career_ids}
          disabled={
            saving || unavailable || !careers.loaded || Boolean(careers.error)
          }
          onChange={(selected) => change('career_ids', selected)}
        />
      </div>
      {careers.error && (
        <div className={styles.error} role="alert">
          <p>{careers.error}</p>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={careers.reload}
          >
            Reintentar carreras
          </button>
        </div>
      )}
      <footer className={styles.actions}>
        {saving && <span role="status">Guardando materia…</span>}
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={saving}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={
            saving ||
            unavailable ||
            !careers.loaded ||
            Boolean(careers.error) ||
            !options.some(
              (career) =>
                career.status === 'ACTIVE' || originalIds.has(career.id),
            )
          }
        >
          {saving
            ? 'Guardando…'
            : subject
              ? 'Guardar cambios'
              : 'Registrar materia'}
        </button>
      </footer>
    </form>
  )
}
