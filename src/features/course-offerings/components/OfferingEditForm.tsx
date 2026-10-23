import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { AcademicTerm } from '@/features/academic-terms/types/academicTerm.types'
import type { CourseOffering } from '../types/courseOffering.types'
import { getSubjectChoices, getTeacherChoices } from '../api/offeringChoicesApi'
import {
  updateCourseOffering,
  mapOfferingMutationError,
} from '../api/offeringMutationsApi'
import { OfferingEntityPicker } from './OfferingEntityPicker'
import styles from '../pages/AdminCourseOfferingsPage.module.css'

export function OfferingEditForm({
  offering,
  periods,
  onSaved,
  onBusy,
  onCancel,
}: {
  offering: CourseOffering
  periods: AcademicTerm[]
  onSaved: () => void
  onBusy: (busy: boolean) => void
  onCancel: () => void
}) {
  const locked = offering.enrollments_count > 0 || offering.exams_count > 0
  const [teachers, setTeachers] = useState([
    {
      id: offering.teacher.id,
      label: `${offering.teacher.first_names} ${offering.teacher.last_names}`,
      detail: offering.teacher.email,
    },
  ])
  const [subjects, setSubjects] = useState([
    {
      id: offering.subject.id,
      label: `${offering.subject.code} · ${offering.subject.name}`,
      detail: '',
    },
  ])
  const [termId, setTermId] = useState(String(offering.academic_term.id))
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const changed =
    teachers[0]?.id !== offering.teacher.id ||
    subjects[0]?.id !== offering.subject.id ||
    termId !== String(offering.academic_term.id)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (
      pending.current ||
      locked ||
      !changed ||
      !teachers.length ||
      !subjects.length
    )
      return
    pending.current = true
    setBusy(true)
    onBusy(true)
    setError(null)
    setFields({})
    try {
      await updateCourseOffering(offering.id, {
        teacher_id: teachers[0].id,
        subject_id: subjects[0].id,
        academic_term_id: Number(termId),
      })
      onSaved()
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
    <form className={styles.form} onSubmit={submit}>
      {error && (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          {[...new Set(Object.values(fields))].map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      <p className={styles.notice}>
        {locked
          ? 'Esta oferta tiene inscripciones o exámenes. Su docente, materia y periodo se conservan para proteger el historial. Puedes gestionar su estado desde el listado.'
          : 'Solo puedes cambiar la combinación mientras no tenga inscripciones ni exámenes. El servidor comprobará estas condiciones al guardar.'}
      </p>
      <OfferingEntityPicker
        title="Docente"
        selected={teachers}
        onChange={setTeachers}
        load={getTeacherChoices}
        disabled={busy || locked}
      />
      <OfferingEntityPicker
        title="Materia"
        selected={subjects}
        onChange={setSubjects}
        load={getSubjectChoices}
        disabled={busy || locked}
      />
      <label className={styles.filter}>
        Periodo académico *
        <select
          value={termId}
          disabled={busy || locked}
          onChange={(event) => setTermId(event.target.value)}
        >
          {!periods.some(
            (period) => period.id === offering.academic_term.id,
          ) && (
            <option value={offering.academic_term.id} disabled>
              {offering.academic_term.name}
            </option>
          )}
          {periods.map((period) => (
            <option
              key={period.id}
              value={period.id}
              disabled={period.status !== 'ACTIVE'}
            >
              {period.name}
              {period.status !== 'ACTIVE' ? ' — Inactivo' : ''}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={busy}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={
            busy || locked || !changed || !teachers.length || !subjects.length
          }
        >
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
