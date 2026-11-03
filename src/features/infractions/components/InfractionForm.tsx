import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { FormEvent } from 'react'
import { IncidentStudentPicker } from '@/features/incidents/components/IncidentStudentPicker'
import { createInfraction } from '../api/infractionsApi'
import { useInfractionMutation } from '../hooks/useInfractionMutation'
import {
  INFRACTION_TYPE_LABELS,
  validateInfraction,
} from '../utils/infractionValidation'
import type {
  CreateInfractionPayload,
  InfractionStudent,
  InfractionType,
} from '../types/infraction.types'
import { InfractionMutationGuard } from './InfractionMutationGuard'
import styles from '@/features/incidents/components/IncidentForm.module.css'

export function InfractionForm({ examId }: { examId: number }) {
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const [student, setStudent] = useState<InfractionStudent | null>(null)
  const [type, setType] = useState<InfractionType | ''>('')
  const [description, setDescription] = useState('')
  const [observations, setObservations] = useState('')
  const request = useInfractionMutation(
    (payload: CreateInfractionPayload) => createInfraction(examId, payload),
    validateInfraction,
  )
  const back = `/teacher/exams/${examId}/infractions`
  useEffect(() => {
    if (Object.keys(request.fieldErrors).length)
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [request.fieldErrors])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await request.submit({
      student_id: student?.id ?? 0,
      type: type as InfractionType,
      description,
      observations,
    })
  }
  // The detail route is connected in the next part; the receipt remains usable now.
  if (request.saved)
    return (
      <section className={styles.panel} role="status">
        <h2>Infracción #{request.saved.id} registrada</h2>
        <p>
          Se guardó como reportada. No se confirmó una falta ni se aplicó una
          sanción automáticamente.
        </p>
        <Link to={back}>Volver a infracciones</Link>
      </section>
    )
  return (
    <form
      ref={form}
      className={styles.panel}
      onSubmit={submit}
      noValidate
      aria-busy={request.busy}
    >
      <InfractionMutationGuard busy={request.busy} />
      <p>
        Los campos con * son obligatorios. El servidor registra la fecha y el
        docente responsable. El estado inicial será Reportada.
      </p>
      <fieldset
        disabled={request.busy || request.needsRefresh}
        className={styles.student}
        tabIndex={-1}
        aria-invalid={!!request.fieldErrors.student_id}
        aria-describedby={
          request.fieldErrors.student_id ? `${id}-student-error` : undefined
        }
      >
        <legend>Estudiante del examen *</legend>
        <IncidentStudentPicker
          examId={examId}
          value={student}
          onChange={setStudent}
          disabled={request.busy || request.needsRefresh}
          emptyMessage="No se encontraron estudiantes del examen. Prueba con otro nombre, SIS o CI."
        />
        {request.fieldErrors.student_id && (
          <p id={`${id}-student-error`} className={styles.error}>
            {request.fieldErrors.student_id}
          </p>
        )}
      </fieldset>
      <div className={styles.field}>
        <label htmlFor={`${id}-type`}>Tipo de infracción *</label>
        <select
          id={`${id}-type`}
          value={type}
          required
          disabled={request.busy || request.needsRefresh}
          aria-invalid={!!request.fieldErrors.type}
          onChange={(event) =>
            setType(event.target.value as InfractionType | '')
          }
        >
          <option value="">Selecciona una categoría</option>
          {Object.entries(INFRACTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {request.fieldErrors.type && (
          <p className={styles.error}>{request.fieldErrors.type}</p>
        )}
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-description`}>Descripción de los hechos *</label>
        <textarea
          id={`${id}-description`}
          rows={5}
          required
          value={description}
          disabled={request.busy || request.needsRefresh}
          aria-invalid={!!request.fieldErrors.description}
          onChange={(event) => setDescription(event.target.value)}
        />
        {request.fieldErrors.description && (
          <p className={styles.error}>{request.fieldErrors.description}</p>
        )}
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-observations`}>Observaciones adicionales</label>
        <textarea
          id={`${id}-observations`}
          rows={3}
          value={observations}
          disabled={request.busy || request.needsRefresh}
          aria-invalid={!!request.fieldErrors.observations}
          onChange={(event) => setObservations(event.target.value)}
        />
        {request.fieldErrors.observations && (
          <p className={styles.error}>{request.fieldErrors.observations}</p>
        )}
      </div>
      {request.error && (
        <p role="alert" className={styles.error}>
          {request.error}
        </p>
      )}
      {request.needsRefresh && (
        <p role="status">
          Consulta el listado antes de volver a registrar; la operación pudo
          haberse guardado.
        </p>
      )}
      <div className={styles.actions}>
        <Link
          to={back}
          aria-disabled={request.busy}
          onClick={(event) => {
            if (request.busy) event.preventDefault()
          }}
        >
          Cancelar
        </Link>
        <button type="submit" disabled={request.busy || request.needsRefresh}>
          {request.busy ? 'Registrando…' : 'Registrar infracción'}
        </button>
      </div>
    </form>
  )
}
