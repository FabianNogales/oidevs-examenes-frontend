import { useRef, useState } from 'react'
import { useExamNavigationGuard } from '../hooks/useExamNavigationGuard'
import { useExamSchedulerState } from '../hooks/useExamSchedulerState'
import {
  getApiFieldErrors,
  getRequestStatus,
} from '@/features/auth/utils/apiErrors'
import { validateCreateExamForm } from '@/features/exams/utils/examValidation'
import { BuildDefaultExamName } from '../utils/examScheduleFormatters'
import { ExamSubjectBanner } from './ExamScheduler/ExamSubjectBanner'
import { ExamNavigationGuardBanner } from './ExamScheduler/ExamNavigationGuardBanner'
import { ExamSchedulerWorkspace } from './ExamScheduler/ExamSchedulerWorkspace'
import type { CreateExamPayload } from '@/features/exams/types/exam.types'
import type { Subject } from '@/features/subjects/types/subject.types'
import layoutStyles from './ExamScheduler/ExamSchedulerLayout.module.css'

export interface CreateExamFormProps {
  subject: Subject
  onCancel: () => void
  onSubmit: (payload: CreateExamPayload, subject: Subject) => Promise<number>
  onCreated: (examId: number) => void
}

export function CreateExamForm({
  subject,
  onCancel,
  onSubmit,
  onCreated,
}: CreateExamFormProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const initialStudentsCount = Number(
    (subject as unknown as Record<string, unknown>).studentsCount ??
      (subject as unknown as Record<string, unknown>).enrolledCount ??
      0,
  )

  const ClearFieldErrors = (fields: string[]) => {
    setFieldErrors((current) => {
      const next = { ...current }
      fields.forEach((field) => {
        next[field] = ''
      })
      return next
    })
    setSubmitError(null)
  }

  const scheduler = useExamSchedulerState({
    courseOfferingId: subject.courseOfferingId,
    autoDetectNextPartial: true,
    initialEligibleStudentsCount: initialStudentsCount,
    onScheduleFieldChange: ClearFieldErrors,
  })

  const computedExamName = BuildDefaultExamName(
    scheduler.evaluationType,
    scheduler.partialNumber,
  )

  const hasUnsavedChanges =
    scheduler.partialNumber !== scheduler.defaultPartialNumber ||
    scheduler.evaluationType !== 'partial' ||
    scheduler.durationMinutes !== 90 ||
    scheduler.startTime !== '09:45' ||
    scheduler.examDate !== '' ||
    scheduler.selectedRoomIds.length > 0

  const guard = useExamNavigationGuard(hasUnsavedChanges, isSubmitting)

  const HandleSubmitExam = async () => {
    if (isSubmitting || submittingRef.current) return

    const validationErrors = validateCreateExamForm({
      name: computedExamName,
      exam_date: scheduler.examDate,
      start_time: scheduler.startTime,
      duration_minutes: scheduler.durationString,
      evaluation_type: scheduler.evaluationType,
      room_id: scheduler.primaryRoomId,
      rules: '',
    })

    if (!scheduler.areAllSelectedRoomsValid) {
      validationErrors.room_id =
        'Selecciona un aula disponible o confirma el uso compartido para este horario.'
    }

    setFieldErrors(validationErrors)
    setSubmitError(null)
    if (Object.keys(validationErrors).length > 0) return

    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const createdExamId = await onSubmit(
        {
          name: computedExamName,
          exam_date: scheduler.examDate,
          start_time: `${scheduler.startTime}:00`,
          duration_minutes: scheduler.durationMinutes,
          room_id: Number(scheduler.primaryRoomId),
          evaluation_type: scheduler.evaluationType,
          partial_number:
            scheduler.evaluationType === 'partial'
              ? Math.min(6, Math.max(1, Number(scheduler.partialNumber) || 1))
              : null,
          is_shared_room: scheduler.isSharedRoomEnabled,
          shared_consent: scheduler.selectedRoomIds.some((id) =>
            scheduler.consentedSharedRoomIds.has(id),
          ),
          additional_room_ids:
            scheduler.selectedRoomIds.length > 1
              ? scheduler.selectedRoomIds.slice(1).map(Number)
              : [],
          rules: null,
        },
        subject,
      )
      guard.allowNavigation()
      onCreated(createdExamId)
    } catch (error) {
      const apiError =
        error instanceof Error && error.cause ? error.cause : error
      const status = getRequestStatus(apiError)
      if (status === 422) {
        setFieldErrors(getApiFieldErrors(apiError))
        setSubmitError(
          'Revisa los datos seleccionados para programar la evaluación.',
        )
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

  const activeErrorMessage =
    submitError ||
    scheduler.roomsState.roomError ||
    fieldErrors.room_id ||
    fieldErrors.exam_date ||
    fieldErrors.start_time ||
    fieldErrors.duration_minutes ||
    fieldErrors.name

  return (
    <form
      className={layoutStyles.schedulerForm}
      onSubmit={(event) => {
        event.preventDefault()
        void HandleSubmitExam()
      }}
      aria-label="Programar Evaluación"
    >
      <ExamNavigationGuardBanner
        blocked={guard.blocked}
        isBusy={isSubmitting}
        stayLabel="Continuar"
        onStay={guard.stay}
        onDiscard={guard.discard}
      />

      <ExamSubjectBanner
        subjectName={subject.name}
        subjectCode={subject.code}
        academicTermName={subject.academicManagement}
        isSelectionValid={scheduler.isSelectionValid}
        showValidationPill
      />

      <ExamSchedulerWorkspace
        scheduler={scheduler}
        examName={computedExamName}
        controlsDisabled={isSubmitting}
        isSubmitting={isSubmitting}
        activeErrorMessage={activeErrorMessage}
        onPartialChange={scheduler.setPartialNumber}
        onEvaluationTypeChange={scheduler.setEvaluationType}
        onCancel={onCancel}
      />
    </form>
  )
}