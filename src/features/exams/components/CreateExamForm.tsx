import { useEffect, useRef, useState } from 'react'
import { useExamNavigationGuard } from '../hooks/useExamNavigationGuard'

import { ExamFormFields } from './ExamFormFields'
import { useAvailableRooms } from '@/features/exams/hooks/useAvailableRooms'
import {
  getApiFieldErrors,
  getRequestStatus,
} from '@/features/auth/utils/apiErrors'
import { validateCreateExamForm } from '@/features/exams/utils/examValidation'
import type {
  CreateExamPayload,
  EvaluationType,
} from '@/features/exams/types/exam.types'
import type { Subject } from '@/features/subjects/types/subject.types'

import styles from './CreateExamModal.module.css'
import pageStyles from './CreateExamForm.module.css'

interface CreateExamFormProps {
  subject: Subject
  onCancel: () => void
  onSubmit: (payload: CreateExamPayload, subject: Subject) => Promise<number>
  onCreated: (examId: number) => void
}

const DEFAULT_FORM = {
  name: '',
  exam_date: '',
  start_time: '',
  duration_minutes: '90',
  evaluation_type: 'partial' as EvaluationType,
  room_id: '',
  rules: '',
}

export function CreateExamForm({
  subject,
  onCancel,
  onSubmit,
  onCreated,
}: CreateExamFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formValues, setFormValues] = useState(DEFAULT_FORM)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { rooms, roomError, isLoadingRooms, hasSchedule, isReady } =
    useAvailableRooms(
      true,
      formValues.exam_date,
      formValues.start_time,
      formValues.duration_minutes,
    )
  const submittingRef = useRef(false)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const selectedSubject = subject

  const selectedRoomAvailable = rooms.some(
    (room) => String(room.id) === formValues.room_id,
  )
  const isSubmitDisabled = isSubmitting || !isReady || !selectedRoomAvailable

  const guard = useExamNavigationGuard(
    JSON.stringify(formValues) !== JSON.stringify(DEFAULT_FORM),
    isSubmitting,
  )
  const noticeRef = useRef<HTMLElement>(null)
  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])
  useEffect(() => {
    if (guard.blocked) noticeRef.current?.focus()
  }, [guard.blocked])

  const handleInputChange = (
    field: keyof typeof DEFAULT_FORM,
    value: string,
  ) => {
    const changesSchedule =
      field === 'exam_date' ||
      field === 'start_time' ||
      field === 'duration_minutes'
    setFormValues((current) => ({
      ...current,
      [field]: value,
      ...(changesSchedule ? { room_id: '' } : {}),
    }))
    setFieldErrors((current) => ({
      ...current,
      [field]: '',
      ...(changesSchedule ? { room_id: '' } : {}),
      ...(field === 'exam_date' || field === 'start_time'
        ? { exam_date: '', start_time: '' }
        : {}),
    }))
    setSubmitError(null)
  }

  const handleSubmit = async () => {
    if (isSubmitDisabled || submittingRef.current) return
    const errors = validateCreateExamForm(formValues)
    if (!rooms.some((room) => String(room.id) === formValues.room_id)) {
      errors.room_id = 'Selecciona un ambiente disponible para este horario.'
    }
    if (!selectedSubject) {
      errors.course_offering_id = 'Debes seleccionar una materia asignada.'
    }
    setFieldErrors(errors)
    setSubmitError(null)
    if (Object.keys(errors).length > 0 || !selectedSubject) return

    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const examId = await onSubmit(
        {
          name: formValues.name.trim(),
          exam_date: formValues.exam_date,
          start_time: `${formValues.start_time}:00`,
          duration_minutes: Number(formValues.duration_minutes),
          room_id: Number(formValues.room_id),
          evaluation_type: formValues.evaluation_type,
          rules: formValues.rules.trim() || null,
        },
        selectedSubject,
      )
      guard.allowNavigation()
      onCreated(examId)
    } catch (error) {
      const apiError =
        error instanceof Error && error.cause ? error.cause : error
      const status = getRequestStatus(apiError)
      if (status === 422) {
        setFieldErrors(getApiFieldErrors(apiError))
        setSubmitError('Revisa los datos ingresados para programar el examen.')
      } else {
        setSubmitError(
          status === 403
            ? 'No tienes autorización para programar este examen.'
            : 'No se pudo programar el examen. Inténtalo nuevamente.',
        )
      }
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className={pageStyles.form}
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
      aria-label="Crear examen"
    >
      {guard.blocked ? (
        <section
          ref={noticeRef}
          tabIndex={-1}
          className={pageStyles.notice}
          role="alert"
        >
          <p>
            {isSubmitting
              ? 'Se est\u00e1 guardando el examen. Espera a que termine.'
              : 'Tienes cambios sin guardar. \u00bfDeseas descartarlos y salir?'}
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={guard.stay}>
              Continuar
            </button>
            <button
              type="button"
              onClick={guard.discard}
              disabled={isSubmitting}
            >
              Descartar cambios
            </button>
          </div>
        </section>
      ) : null}
      <section
        className={pageStyles.subjectContext}
        aria-label="Materia y periodo del examen"
      >
        <h2>{subject.name}</h2>
        <p>
          {subject.code ? `${subject.code} \u00b7 ` : ''}Periodo académico:{' '}
          {subject.academicManagement}
        </p>
        {fieldErrors.course_offering_id ? (
          <p className={styles.inlineError} role="alert">
            {fieldErrors.course_offering_id}
          </p>
        ) : null}
      </section>

      <ExamFormFields
        enforceDateMinimum={false}
        values={formValues}
        errors={fieldErrors}
        roomsState={{ rooms, roomError, isLoadingRooms, hasSchedule }}
        disabled={isSubmitting}
        onChange={handleInputChange}
        nameInputRef={firstInputRef}
      >
        <div className={styles.stateRow}>
          <span className={styles.stateLabel}>Estado inicial</span>
          <span className={styles.badge}>Programado</span>
        </div>
      </ExamFormFields>
      {submitError ? (
        <p className={styles.inlineError} role="alert">
          {submitError}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={isSubmitDisabled || isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : 'Guardar examen'}
        </button>
      </div>
    </form>
  )
}
