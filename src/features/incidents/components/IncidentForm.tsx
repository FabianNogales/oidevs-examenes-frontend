import { useEffect, useId, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { IncidentStudentPicker } from './IncidentStudentPicker'
import { IncidentNavigationGuard } from './IncidentNavigationGuard'
import { useIncidentSubmission } from '../hooks/useIncidentSubmission'
import { INCIDENT_TYPE_LABELS } from '../utils/incidentValidation'
import type {
  Incident,
  IncidentStudent,
  IncidentType,
} from '../types/incident.types'
import styles from './IncidentForm.module.css'

export function IncidentForm({
  examId,
  backTo,
  initialStudent = null,
  initialType = '',
  onCreated,
  onCancel,
  onBusyChange,
}: {
  examId: number
  backTo: string
  initialStudent?: IncidentStudent | null
  initialType?: IncidentType | ''
  onCreated?: (incident: Incident) => void
  onCancel?: () => void
  onBusyChange?: (busy: boolean) => void
}) {
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const [type, setType] = useState<IncidentType | ''>(initialType)
  const [description, setDescription] = useState('')
  const [identify, setIdentify] = useState(initialStudent !== null)
  const [student, setStudent] = useState<IncidentStudent | null>(initialStudent)
  const [selectionError, setSelectionError] = useState(false)
  const request = useIncidentSubmission(examId)
  const disabled = request.saving || request.forbidden
  const errors = request.fieldErrors
  useEffect(() => {
    if (Object.keys(errors).length || selectionError)
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors, selectionError])
  useEffect(() => {
    onBusyChange?.(request.saving)
  }, [request.saving, onBusyChange])
  useEffect(() => {
    if (request.saved) onCreated?.(request.saved)
  }, [request.saved, onCreated])

  if (request.saved)
    return (
      <section className={styles.panel} role="status">
        {!onCreated ? (
          <Navigate
            to={`${backTo.split('?')[0]}/${request.saved.id}${backTo.includes('?') ? `?${backTo.split('?')[1]}` : ''}`}
            replace
            state={{ createdIncidentId: request.saved.id }}
          />
        ) : null}
        <h2>Incidencia registrada</h2>
        <p>El servidor confirmó el registro #{request.saved.id}.</p>
        <p>La incidencia documenta lo ocurrido y no confirma una infracción.</p>
        <Link to={backTo} replace>
          Volver a incidencias
        </Link>
      </section>
    )

  return (
    <form
      ref={form}
      className={styles.panel}
      noValidate
      aria-busy={request.saving}
      onSubmit={(event) => {
        event.preventDefault()
        if (disabled) return
        setSelectionError(identify && !student)
        if (identify && !student) return
        void request.submit({
          type: type as IncidentType,
          description,
          student_id: identify ? (student?.id ?? null) : null,
        })
      }}
    >
      <p>
        Los campos con * son obligatorios. El examen, autor, fecha y hora se
        registran según el contexto y la sesión del servidor.
      </p>
      <IncidentNavigationGuard busy={request.saving} />
      {request.error ? (
        <p className={styles.error} role="alert">
          {request.error}
        </p>
      ) : null}
      <div className={styles.field}>
        <label htmlFor={`${id}-type`}>Tipo de incidencia *</label>
        <select
          id={`${id}-type`}
          value={type}
          required
          disabled={disabled}
          aria-invalid={Boolean(errors.type)}
          aria-describedby={errors.type ? `${id}-type-error` : undefined}
          onChange={(event) => setType(event.target.value as IncidentType | '')}
        >
          <option value="">Selecciona una categoría</option>
          {Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.type ? (
          <p className={styles.error} id={`${id}-type-error`}>
            {errors.type}
          </p>
        ) : null}
      </div>
      <fieldset
        className={styles.student}
        disabled={disabled}
        tabIndex={-1}
        aria-invalid={selectionError || Boolean(errors.student_id)}
        aria-describedby={
          selectionError || errors.student_id
            ? `${id}-student-error`
            : undefined
        }
      >
        <legend>Estudiante involucrado</legend>
        <label className={styles.choice}>
          <input
            type="radio"
            name={`${id}-identify`}
            checked={!identify}
            onChange={() => {
              setIdentify(false)
              setStudent(null)
              setSelectionError(false)
            }}
          />
          Sin estudiante identificable o no aplica
        </label>
        <label className={styles.choice}>
          <input
            type="radio"
            name={`${id}-identify`}
            checked={identify}
            onChange={() => setIdentify(true)}
          />
          Seleccionar estudiante del examen
        </label>
        {identify ? (
          <IncidentStudentPicker
            examId={examId}
            value={student}
            disabled={disabled}
            onChange={(value) => {
              setStudent(value)
              setSelectionError(false)
            }}
          />
        ) : null}
        {selectionError || errors.student_id ? (
          <p id={`${id}-student-error`} className={styles.error} role="alert">
            {errors.student_id ??
              'Selecciona un estudiante o indica que no fue identificado.'}
          </p>
        ) : null}
      </fieldset>
      <div className={styles.field}>
        <label htmlFor={`${id}-description`}>
          Descripción de lo ocurrido *
        </label>
        <textarea
          id={`${id}-description`}
          value={description}
          rows={6}
          required
          disabled={disabled}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={`${id}-description-help${errors.description ? ` ${id}-description-error` : ''}`}
          onChange={(event) => setDescription(event.target.value)}
        />
        <small id={`${id}-description-help`}>
          Describe los hechos observados. Una sospecha no equivale a una
          infracción confirmada.
        </small>
        {errors.description ? (
          <p className={styles.error} id={`${id}-description-error`}>
            {errors.description}
          </p>
        ) : null}
      </div>
      <div className={styles.actions}>
        {onCancel ? (
          <button type="button" disabled={request.saving} onClick={onCancel}>
            Cancelar
          </button>
        ) : (
          <Link
            to={backTo}
            onClick={(event) => {
              if (request.saving) event.preventDefault()
            }}
            aria-disabled={request.saving}
          >
            Cancelar
          </Link>
        )}
        <button type="submit" disabled={disabled}>
          {request.saving ? 'Registrando…' : 'Registrar incidencia'}
        </button>
      </div>
    </form>
  )
}
