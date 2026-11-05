import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { IncidentStudentPicker } from '@/features/incidents/components/IncidentStudentPicker'
import { InfractionMutationGuard } from '@/features/infractions/components/InfractionMutationGuard'
import { useInfractionMutation } from '@/features/infractions/hooks/useInfractionMutation'
import type { InfractionStudent } from '@/features/infractions/types/infraction.types'
import { createExpulsion, validateExpulsion } from '../api/expulsionsApi'
import type {
  ExpulsionPayload,
  RelatedInfraction,
} from '../types/expulsion.types'
import { RelatedInfractionPicker } from './RelatedInfractionPicker'
import styles from '@/features/incidents/components/IncidentForm.module.css'
import management from '@/features/infractions/components/InfractionManagement.module.css'
export function ExpulsionForm({ examId }: { examId: number }) {
  const id = useId(),
    form = useRef<HTMLFormElement>(null)
  const [student, setStudent] = useState<InfractionStudent | null>(null),
    [infraction, setInfraction] = useState<RelatedInfraction | null>(null),
    [reason, setReason] = useState(''),
    [confirmed, setConfirmed] = useState(false)
  const request = useInfractionMutation(
    (p: ExpulsionPayload) => createExpulsion(examId, p),
    validateExpulsion,
  )
  const fields: Record<string, string | undefined> = request.fieldErrors
  const disabled = request.busy || request.needsRefresh,
    back = `/teacher/exams/${examId}/expulsions`
  useEffect(() => {
    if (Object.keys(fields).length)
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [fields])
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await request.submit({
      student_id: student?.id ?? 0,
      reason,
      infraction_id: infraction?.id ?? null,
      confirmed,
    })
  }
  if (request.saved)
    return (
      <Navigate
        replace
        to={`${back}/${request.saved.id}`}
        state={{ createdExpulsionId: request.saved.id }}
      />
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
        Los campos con * son obligatorios. La fecha, hora y responsable se
        registran en el servidor.
      </p>
      <fieldset
        className={styles.student}
        disabled={disabled}
        tabIndex={-1}
        aria-invalid={!!fields.student_id}
        aria-describedby={fields.student_id ? `${id}-student-error` : undefined}
      >
        <legend>Estudiante del examen *</legend>
        <IncidentStudentPicker
          examId={examId}
          value={student}
          onChange={(v) => {
            setStudent(v)
            setInfraction(null)
            setConfirmed(false)
          }}
          disabled={disabled}
          emptyMessage="No se encontraron estudiantes del examen. Prueba con otro nombre, SIS o CI."
        />
        {fields.student_id && (
          <p id={`${id}-student-error`} className={styles.error}>
            {fields.student_id}
          </p>
        )}
      </fieldset>
      <div className={styles.field}>
        <label htmlFor={`${id}-reason`}>Motivo de expulsión *</label>
        <textarea
          id={`${id}-reason`}
          rows={5}
          required
          disabled={disabled}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            setConfirmed(false)
          }}
          aria-invalid={!!fields.reason}
          aria-describedby={fields.reason ? `${id}-reason-error` : undefined}
        />
        {fields.reason && (
          <p id={`${id}-reason-error`} className={styles.error}>
            {fields.reason}
          </p>
        )}
      </div>
      {student && (
        <RelatedInfractionPicker
          key={student.id}
          examId={examId}
          studentId={student.id}
          value={infraction}
          onChange={(v) => {
            setInfraction(v)
            setConfirmed(false)
          }}
          disabled={disabled}
        />
      )}
      {fields.infraction_id && (
        <p role="alert" className={styles.error}>
          {fields.infraction_id}
        </p>
      )}
      <p>
        Esta medida conserva la asistencia y los antecedentes. Sus efectos sobre
        nuevos ingresos dependen de las reglas institucionales vigentes.
      </p>
      <label className={management.confirm}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={disabled}
          onChange={(e) => setConfirmed(e.target.checked)}
          aria-invalid={!!fields.confirmed}
          aria-describedby={
            fields.confirmed ? `${id}-confirmed-error` : undefined
          }
        />
        Confirmo la expulsión del estudiante seleccionado por el motivo
        indicado. *
      </label>
      {fields.confirmed && (
        <p id={`${id}-confirmed-error`} className={styles.error}>
          {fields.confirmed}
        </p>
      )}
      {request.error && (
        <p role="alert" className={styles.error}>
          {request.error}
        </p>
      )}
      {request.needsRefresh && (
        <p role="status">
          Consulta el listado antes de repetir la operación; pudo haberse
          guardado. Si ya existe una expulsión vigente, no registres otra.
        </p>
      )}
      <div className={styles.actions}>
        <Link
          to={back}
          aria-disabled={request.busy}
          onClick={(e) => {
            if (request.busy) e.preventDefault()
          }}
        >
          Cancelar
        </Link>
        <button type="submit" disabled={disabled}>
          {request.busy ? 'Registrando…' : 'Confirmar expulsión'}
        </button>
      </div>
    </form>
  )
}
