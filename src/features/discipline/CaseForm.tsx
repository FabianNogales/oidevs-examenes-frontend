import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Field } from '@/shared/components/ui/Field/Field'
import { Select } from '@/shared/components/ui/Field/Select'
import { Textarea } from '@/shared/components/ui/Field/Textarea'
import { Button } from '@/shared/components/ui/Button/Button'
import { IncidentStudentPicker } from '@/features/incidents/components/IncidentStudentPicker'
import { IncidentNavigationGuard } from '@/features/incidents/components/IncidentNavigationGuard'
import { INCIDENT_TYPE_LABELS } from '@/features/incidents/utils/incidentValidation'
import { INFRACTION_TYPE_LABELS } from '@/features/infractions/utils/infractionValidation'
import type { IncidentStudent } from '@/features/incidents/types/incident.types'
import {
  caseError,
  saveCase,
  type CaseContext,
  type CaseDetail,
  type CasePayload,
} from './disciplineApi'
import styles from '@/features/incidents/components/IncidentForm.module.css'

export function CaseForm({
  context,
  initialStudent = null,
  initialType = '',
  onSaved,
  onCancel,
  onBusyChange,
}: {
  context: CaseContext
  initialStudent?: IncidentStudent | null
  initialType?: string
  onSaved: (value: CaseDetail) => void
  onCancel: () => void
  onBusyChange?: (busy: boolean) => void
}) {
  const [student, setStudent] = useState(initialStudent)
  const [type, setType] = useState(initialType ? `INCIDENT:${initialType}` : '')
  const [description, setDescription] = useState('')
  const [observations, setObservations] = useState('')
  const [decision, setDecision] = useState<'RECORD' | 'EXPEL'>('RECORD')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const lock = useRef(false)
  const attempt = useRef<{ fingerprint: string; payload: CasePayload } | null>(
    null,
  )
  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])
  const canExpel = context.permissions.can_expel && student !== null
  async function submit() {
    if (lock.current) return
    const [kind, category] = type.split(':')
    const payload = {
      kind,
      type: category,
      description,
      observations,
      student_id: student?.id ?? null,
      decision: canExpel ? decision : 'RECORD',
      ...(canExpel && decision === 'EXPEL' ? { reason, confirmed } : {}),
    } as Omit<CasePayload, 'request_key'>
    const fingerprint = JSON.stringify(payload)
    if (
      !attempt.current ||
      (!uncertain && attempt.current.fingerprint !== fingerprint)
    )
      attempt.current = {
        fingerprint,
        payload: { ...payload, request_key: crypto.randomUUID() },
      }
    lock.current = true
    setBusy(true)
    setError(null)
    setFields({})
    try {
      onSaved(await saveCase(context.exam.id, attempt.current.payload))
    } catch (cause) {
      setError(caseError(cause))
      const response = axios.isAxiosError(cause) ? cause.response : undefined
      if (response?.status === 422) {
        setFields(
          Object.fromEntries(
            Object.entries(response.data?.errors ?? {}).map(([key, value]) => [
              key,
              Array.isArray(value) ? String(value[0]) : String(value),
            ]),
          ),
        )
        setUncertain(false)
      } else setUncertain(!response || response.status >= 500)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <form
      className={styles.panel}
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <IncidentNavigationGuard busy={busy} />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {uncertain && (
        <p role="status">
          La respuesta quedó pendiente. Reintenta con la misma clave para
          recuperar el resultado sin duplicar el caso.
        </p>
      )}
      <fieldset className={styles.student} disabled={busy || uncertain}>
        <legend>Datos del caso</legend>
        <Field label="Motivo" required error={fields.type}>
          {(control) => (
            <Select
              {...control}
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">Selecciona el motivo</option>
              <optgroup label="Incidencias">
                {Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={`INCIDENT:${value}`}>
                    {label}
                  </option>
                ))}
              </optgroup>
              {context.permissions.can_manage && (
                <optgroup label="Infracciones">
                  {Object.entries(INFRACTION_TYPE_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={`INFRACTION:${value}`}>
                        {label}
                      </option>
                    ),
                  )}
                </optgroup>
              )}
            </Select>
          )}
        </Field>
        <fieldset
          className={styles.student}
          aria-label="Estudiante involucrado"
        >
          <legend>
            Estudiante {type.startsWith('INFRACTION:') ? '*' : '(opcional)'}
          </legend>
          <IncidentStudentPicker
            examId={context.exam.id}
            value={student}
            onChange={(value) => {
              setStudent(value)
              setDecision('RECORD')
              setConfirmed(false)
            }}
            disabled={busy || uncertain}
          />
          {fields.student_id && (
            <p role="alert" className={styles.error}>
              {fields.student_id}
            </p>
          )}
        </fieldset>
        <Field
          label="Descripción de lo ocurrido"
          required
          error={fields.description}
        >
          {(control) => (
            <Textarea
              {...control}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          )}
        </Field>
        <Field label="Observaciones" error={fields.observations}>
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
            />
          )}
        </Field>
        <Field label="Decisión">
          {(control) => (
            <Select
              {...control}
              value={canExpel ? decision : 'RECORD'}
              onChange={(event) => {
                setDecision(event.target.value as 'RECORD' | 'EXPEL')
                setConfirmed(false)
              }}
            >
              <option value="RECORD">Solo registrar</option>
              {canExpel && (
                <option value="EXPEL">Registrar y expulsar del examen</option>
              )}
            </Select>
          )}
        </Field>
        {canExpel && decision === 'EXPEL' && (
          <>
            <Field
              label="Justificación de la expulsión"
              required
              error={fields.reason}
            >
              {(control) => (
                <Textarea
                  {...control}
                  rows={3}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value)
                    setConfirmed(false)
                  }}
                />
              )}
            </Field>
            <label className={styles.choice}>
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Confirmo la expulsión de este estudiante por el motivo indicado.
            </label>
          </>
        )}
      </fieldset>
      <div className={styles.actions}>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={busy}>
          {busy
            ? 'Guardando…'
            : uncertain
              ? 'Recuperar o completar registro'
              : canExpel && decision === 'EXPEL'
                ? 'Registrar y expulsar'
                : 'Registrar caso'}
        </Button>
      </div>
    </form>
  )
}
