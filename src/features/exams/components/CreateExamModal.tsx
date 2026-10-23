import { useCallback, useEffect, useId, useRef, useState } from 'react'

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
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock'

interface CreateExamModalProps {
  isOpen: boolean
  subject: Subject | null
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (payload: CreateExamPayload, subject: Subject) => Promise<void>
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

export function CreateExamModal({
  isOpen,
  subject,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CreateExamModalProps) {
  const [formValues, setFormValues] = useState(DEFAULT_FORM)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  useBodyScrollLock(isOpen && Boolean(subject))
  const { rooms, roomError, isLoadingRooms, hasSchedule, isReady } =
    useAvailableRooms(
      isOpen,
      formValues.exam_date,
      formValues.start_time,
      formValues.duration_minutes,
    )
  const submittingRef = useRef(false)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const subjectId = useId()
  const selectedSubject = subject

  const selectedRoomAvailable = rooms.some(
    (room) => String(room.id) === formValues.room_id,
  )
  const isSubmitDisabled = isSubmitting || !isReady || !selectedRoomAvailable

  const handleCloseDialog = useCallback(() => {
    if (isSubmitting || submittingRef.current) return
    setFormValues(DEFAULT_FORM)
    setFieldErrors({})
    setSubmitError(null)
    onClose()
  }, [isSubmitting, onClose])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        handleCloseDialog()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const frameId = requestAnimationFrame(() => firstInputRef.current?.focus())

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(frameId)
    }
  }, [handleCloseDialog, isOpen, isSubmitting])

  if (!isOpen || !subject) {
    return null
  }

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
    try {
      await onSubmit(
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
    }
  }

  const errorFor = (field: string) =>
    fieldErrors[field] || (field === 'room_id' ? roomError : null)
  const fieldAccessibility = (field: string, id: string) => ({
    'aria-invalid': Boolean(errorFor(field)),
    'aria-describedby': errorFor(field) ? `${id}-error` : undefined,
  })
  const renderFieldError = (field: string, id: string) =>
    errorFor(field) ? (
      <p id={`${id}-error`} className={styles.inlineError} role="alert">
        {errorFor(field)}
      </p>
    ) : null

  return (
    <div
      className={styles.overlay}
      aria-modal="true"
      role="dialog"
      aria-labelledby="create-exam-title"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Programación</p>
            <h2 id="create-exam-title">Crear examen</h2>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            aria-label="Cerrar modal"
            onClick={handleCloseDialog}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className={styles.fieldFull}>
          <label htmlFor={subjectId}>Materia *</label>
          <input
            id={subjectId}
            {...fieldAccessibility('course_offering_id', subjectId)}
            value={`${subject.code ? `${subject.code} — ` : ''}${subject.name}`}
            readOnly
          />
          {renderFieldError('course_offering_id', subjectId)}
        </div>

        {selectedSubject ? (
          <p className={styles.term}>
            <span>Gestión</span> {selectedSubject.academicManagement}
          </p>
        ) : null}

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
            onClick={handleCloseDialog}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void handleSubmit()}
            disabled={isSubmitDisabled || isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar examen'}
          </button>
        </div>
      </div>
    </div>
  )
}
