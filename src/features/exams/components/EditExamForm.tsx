import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ExamFormFields } from './ExamFormFields'
import { useAvailableRooms } from '../hooks/useAvailableRooms'
import { useExamNavigationGuard } from '../hooks/useExamNavigationGuard'
import { ExamMutationError, updateExam } from '../api/examMutationsApi'
import type { ExamDetail } from '../api/examDetailsApi'
import type { EvaluationType } from '../types/exam.types'
import { validateExamForm, type ExamFormValues } from '../utils/examValidation'
import styles from './EditExamForm.module.css'

function initialValues(exam: ExamDetail): ExamFormValues {
  return {
    name: exam.name,
    exam_date: exam.exam_date,
    start_time: exam.start_time.slice(0, 5),
    duration_minutes: String(exam.duration_minutes),
    evaluation_type: exam.evaluation_type ?? '',
    room_id: exam.room ? String(exam.room.id) : '',
    rules: exam.rules ?? '',
  }
}

type Props = {
  exam: ExamDetail
  backTo: string
  onSaved: () => void
  onReload: () => void
}

export function EditExamForm({ exam, backTo, onSaved, onReload }: Props) {
  const navigate = useNavigate()
  const [values, setValues] = useState(() => initialValues(exam))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [needsReload, setNeedsReload] = useState(false)
  const request = useRef<AbortController | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const noticeRef = useRef<HTMLElement>(null)
  const roomsState = useAvailableRooms(
    true,
    values.exam_date,
    values.start_time,
    values.duration_minutes,
    exam.id,
  )
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues(exam))
  const guard = useExamNavigationGuard(dirty, busy)
  const selectedRoomAvailable = roomsState.rooms.some(
    (room) => String(room.id) === values.room_id,
  )
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    if (guard.blocked) noticeRef.current?.focus()
  }, [guard.blocked])

  function change(field: keyof ExamFormValues, value: string) {
    const schedule = ['exam_date', 'start_time', 'duration_minutes'].includes(
      field,
    )
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(schedule ? { room_id: '' } : {}),
    }))
    setErrors((current) => ({
      ...current,
      [field]: '',
      ...(schedule ? { room_id: '', exam_date: '', start_time: '' } : {}),
    }))
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.current || !dirty || needsReload || !roomsState.isReady) return
    const validation = validateExamForm(values)
    if (!selectedRoomAvailable)
      validation.room_id =
        'Selecciona un ambiente disponible para este horario.'
    setErrors(validation)
    if (Object.keys(validation).length) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      )
      return
    }
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError(null)
    try {
      await updateExam(
        exam,
        {
          name: values.name.trim(),
          exam_date: values.exam_date,
          start_time: `${values.start_time}:00`,
          duration_minutes: Number(values.duration_minutes),
          room_id: Number(values.room_id),
          evaluation_type: values.evaluation_type as EvaluationType,
          rules: values.rules.trim() || null,
        },
        controller.signal,
      )
      if (!controller.signal.aborted) {
        guard.allowNavigation()
        onSaved()
      }
    } catch (cause) {
      if (controller.signal.aborted) return
      const failure = cause instanceof ExamMutationError ? cause : null
      setError(
        failure?.message ??
          'No se pudo confirmar el guardado. Recarga el examen antes de reintentar.',
      )
      setErrors(failure?.fields ?? {})
      setNeedsReload(failure?.status !== 422)
      if (failure?.fields.room_id) {
        setValues((current) => ({ ...current, room_id: '' }))
        roomsState.reload()
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false)
      if (request.current === controller) request.current = null
    }
  }

  return (
    <form
      ref={formRef}
      className={styles.form}
      noValidate
      onSubmit={(event) => void submit(event)}
      aria-busy={busy}
    >
      {guard.blocked ? (
        <section
          className={styles.notice}
          role="alert"
          ref={noticeRef}
          tabIndex={-1}
        >
          <p>
            {busy
              ? 'Se está guardando el examen. Espera a que termine la operación.'
              : 'Tienes cambios sin guardar. ¿Deseas descartarlos y salir?'}
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={guard.stay}>
              Seguir editando
            </button>
            <button type="button" disabled={busy} onClick={guard.discard}>
              Descartar cambios
            </button>
          </div>
        </section>
      ) : null}
      <p className={styles.context}>
        La materia y el periodo académico se conservan. Los campos con * son
        obligatorios.
      </p>
      <fieldset disabled={busy || needsReload}>
        <legend className={styles.legend}>
          Información editable del examen
        </legend>
        <ExamFormFields
          values={values}
          errors={errors}
          roomsState={roomsState}
          disabled={busy || needsReload}
          onChange={change}
        />
      </fieldset>
      {roomsState.roomError && !needsReload ? (
        <button type="button" onClick={roomsState.reload} disabled={busy}>
          Reintentar ambientes
        </button>
      ) : null}
      {error ? (
        <section className={styles.error} role="alert">
          <p>{error}</p>
          {Object.entries(errors)
            .filter(([key]) => !(key in values))
            .map(([key, value]) => (
              <p key={key}>{value}</p>
            ))}
          {needsReload ? (
            <>
              <p>
                Al recargar se reemplazará lo escrito por la información actual
                del examen.
              </p>
              <button type="button" onClick={onReload}>
                Recargar examen y descartar cambios
              </button>
            </>
          ) : null}
        </section>
      ) : null}
      <div className={styles.actions}>
        <button
          type="button"
          disabled={busy}
          onClick={() => void navigate(backTo)}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.primary}
          disabled={
            busy ||
            needsReload ||
            !dirty ||
            !roomsState.isReady ||
            !selectedRoomAvailable
          }
        >
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
