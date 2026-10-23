import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { getAdminTeacher } from '@/features/admin/api/adminTeachersApi'
import { getSubjectChoices, getTeacherChoices } from '../api/offeringChoicesApi'
import type { OfferingChoice } from '../api/offeringChoicesApi'
import {
  createCourseOfferings,
  mapOfferingMutationError,
} from '../api/offeringMutationsApi'
import { OfferingEntityPicker } from './OfferingEntityPicker'
import styles from '../pages/AdminCourseOfferingsPage.module.css'

export function OfferingManualForm({
  termId,
  teacherId,
  onSaved,
  onBusy,
  onCancel,
}: {
  termId: number
  teacherId?: number
  onSaved: (count: number) => void
  onBusy: (busy: boolean) => void
  onCancel: () => void
}) {
  const [teachers, setTeachers] = useState<OfferingChoice[]>([])
  const [subjects, setSubjects] = useState<OfferingChoice[]>([])
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => {
    let current = true
    if (teacherId)
      getAdminTeacher(teacherId).then(
        (teacher) => {
          if (current && teacher.status === 'ACTIVE')
            setTeachers([
              {
                id: teacher.id,
                label: `${teacher.first_names} ${teacher.last_names}`,
                detail: teacher.institutional_code,
              },
            ])
        },
        () => {
          if (current)
            setError(
              'No se pudo precargar el docente. Selecciónalo en la lista.',
            )
        },
      )
    return () => {
      current = false
    }
  }, [teacherId])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current || !teachers.length || !subjects.length) return
    pending.current = true
    setBusy(true)
    onBusy(true)
    setError(null)
    setFields({})
    setNotice(null)
    try {
      const saved = await createCourseOfferings({
        teacher_id: teachers[0].id,
        academic_term_id: termId,
        subject_ids: subjects.map((subject) => subject.id),
      })
      setSubjects([])
      setNotice(`${saved.length} asignaciones registradas correctamente.`)
      onSaved(saved.length)
    } catch (cause) {
      const failure = mapOfferingMutationError(cause)
      setError(failure.message)
      setFields(failure.fields)
    } finally {
      pending.current = false
      setBusy(false)
      onBusy(false)
    }
  }
  return (
    <form
      className={styles.form}
      onSubmit={submit}
      aria-label="Asignación manual"
      aria-busy={busy}
    >
      <p className={styles.notice}>
        Selecciona un docente y una o varias materias. Guardar agrega ofertas;
        quitar una selección aquí no elimina asignaciones existentes.
      </p>
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          {[...new Set(Object.values(fields))].map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      <OfferingEntityPicker
        title="Docente"
        selected={teachers}
        onChange={setTeachers}
        load={getTeacherChoices}
        disabled={busy}
      />
      <OfferingEntityPicker
        title="Materias"
        multiple
        selected={subjects}
        onChange={setSubjects}
        load={getSubjectChoices}
        disabled={busy}
      />
      <div className={styles.formActions}>
        <p>{subjects.length} materias seleccionadas</p>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={busy || !teachers.length || !subjects.length}
        >
          {busy ? 'Guardando…' : 'Guardar asignaciones'}
        </button>
      </div>
    </form>
  )
}
