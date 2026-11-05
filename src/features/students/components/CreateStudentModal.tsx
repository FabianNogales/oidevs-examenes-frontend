import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { createAdminStudent, StudentApiError } from '@/features/admin/api/adminStudentsApi'
import { getSubjectCareers } from '@/features/subjects/api/adminSubjectsApi'
import type { SubjectCareer } from '@/features/subjects/types/adminSubject.types'
import type { CreateStudentPayload, Student, StudentFieldErrors } from '@/features/admin/types/student.types'
import styles from '@/features/students/components/AddStudentsModal.module.css'

const fields = [
  ['institutional_code', 'Código SIS'], ['identity_number', 'CI'], ['first_names', 'Nombres'],
  ['last_names', 'Apellidos'], ['email', 'Correo institucional'],
] as const

export function CreateStudentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (student: Student) => void }) {
  const id = useId()
  const pending = useRef(false)
  const [values, setValues] = useState<CreateStudentPayload>({ institutional_code: '', identity_number: '',
    first_names: '', last_names: '', email: '', career_id: '' })
  const [careers, setCareers] = useState<SubjectCareer[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<StudentFieldErrors>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getSubjectCareers(controller.signal).then((result) => {
      if (!controller.signal.aborted) { setCareers(result); setCatalogError(null) }
    }).catch(() => {
      if (!controller.signal.aborted) setCatalogError('No se pudo cargar el catálogo de carreras.')
    }).finally(() => { if (!controller.signal.aborted) setCatalogLoading(false) })
    return () => controller.abort()
  }, [catalogVersion])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current || catalogLoading || catalogError || !values.career_id) return
    pending.current = true
    setSaving(true); setError(null); setErrors({})
    try {
      const student = await createAdminStudent({ ...values, institutional_code: values.institutional_code.trim(),
        identity_number: values.identity_number.trim(), first_names: values.first_names.trim(),
        last_names: values.last_names.trim(), email: values.email.trim().toLowerCase() })
      onCreated(student)
    } catch (cause) {
      setErrors(cause instanceof StudentApiError ? cause.fieldErrors : {})
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el estudiante.')
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return <CollaborationModal title="Registrar estudiante" onClose={onClose} busy={saving}>
    <form className={styles.tabPanel} onSubmit={(event) => void submit(event)}>
      <p>La contraseña inicial será el CI. El estudiante deberá cambiarla al ingresar.</p>
      {error && <p role="alert" className={styles.inlineError}>{error}</p>}
      {fields.map(([field, label]) => <div key={field}>
        <label className={styles.fieldLabel} htmlFor={`${id}-${field}`}>{label}</label>
        <input id={`${id}-${field}`} className={styles.input} required maxLength={255}
          type={field === 'email' ? 'email' : 'text'} value={values[field]} disabled={saving}
          inputMode={field === 'identity_number' ? 'numeric' : undefined}
          pattern={field === 'identity_number' ? '[0-9]+' : undefined}
          aria-invalid={Boolean(errors[field]?.length)} aria-describedby={errors[field]?.length ? `${id}-${field}-error` : undefined}
          onChange={(event) => { setValues((current) => ({ ...current, [field]: event.target.value }));
            setErrors((current) => ({ ...current, [field]: undefined })) }} />
        {errors[field]?.length ? <p id={`${id}-${field}-error`} className={styles.inlineError}>{errors[field]?.join(' ')}</p> : null}
      </div>)}
      <div>
        <label className={styles.fieldLabel} htmlFor={`${id}-career`}>Carrera</label>
        <select id={`${id}-career`} className={styles.input} required value={values.career_id}
          disabled={saving || catalogLoading || Boolean(catalogError)} aria-invalid={Boolean(errors.career_id?.length)}
          aria-describedby={errors.career_id?.length ? `${id}-career-error` : undefined}
          onChange={(event) => { setValues((current) => ({ ...current, career_id: event.target.value }));
            setErrors((current) => ({ ...current, career_id: undefined })) }}>
          <option value="">{catalogLoading ? 'Cargando carreras…' : 'Seleccione una carrera'}</option>
          {careers.map((career) => <option key={career.id} value={career.id}>
            {career.code} — {career.name}{career.status === 'INACTIVE' ? ' (Inactiva)' : ''}
          </option>)}
        </select>
        {errors.career_id?.length ? <p id={`${id}-career-error`} className={styles.inlineError}>{errors.career_id.join(' ')}</p> : null}
        {catalogError && <p role="alert">{catalogError} <button type="button" onClick={() => {
          setCatalogLoading(true); setCatalogVersion((value) => value + 1)
        }}>Reintentar</button></p>}
        {!catalogLoading && !catalogError && careers.length === 0 && <p role="status">No hay carreras registradas.</p>}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>Cancelar</button>
        <button type="submit" className={styles.primaryButton}
          disabled={saving || catalogLoading || Boolean(catalogError) || careers.length === 0}>
          {saving ? 'Registrando…' : 'Registrar estudiante'}
        </button>
      </div>
    </form>
  </CollaborationModal>
}
