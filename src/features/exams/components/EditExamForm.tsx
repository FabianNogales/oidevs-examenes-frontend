import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useExamNavigationGuard } from '../hooks/useExamNavigationGuard'
import { useExamSchedulerState } from '../hooks/useExamSchedulerState'
import { ExamMutationError, updateExam } from '../api/examMutationsApi'
import type { ExamDetail } from '../api/examDetailsApi'
import { validateExamForm } from '../utils/examValidation'
import {
  BuildDefaultExamName,
  ParseExistingExamToSchedulerState,
} from '../utils/examScheduleFormatters'
import { ExamNavigationGuardBanner } from './ExamScheduler/ExamNavigationGuardBanner'
import { ExamSchedulerWorkspace } from './ExamScheduler/ExamSchedulerWorkspace'
import layoutStyles from './ExamScheduler/ExamSchedulerLayout.module.css'

export interface EditExamFormProps {
  exam: ExamDetail
  backTo: string
  onSaved: () => void
  onReload: () => void
}

export function EditExamForm({
  exam,
  backTo,
  onSaved,
  onReload,
}: EditExamFormProps) {
  const navigate = useNavigate()
  const initialParsed = useMemo(
    () => ParseExistingExamToSchedulerState(exam),
    [exam],
  )

  const initialSharedFlag = Boolean(
    (exam as unknown as Record<string, unknown>).is_shared_room ||
      exam.rules?.includes('[SHARED_ROOM]'),
  )
  const offeringId = (exam as unknown as Record<string, unknown>)
    .course_offering_id as number | string | undefined

  const [hasModifiedTitleType, setHasModifiedTitleType] =
    useState<boolean>(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<boolean>(false)
  const [needsReload, setNeedsReload] = useState<boolean>(false)
  const requestRef = useRef<AbortController | null>(null)

  const ClearFieldErrors = (fields: string[]) => {
    setErrors((current) => {
      const next = { ...current }
      fields.forEach((field) => {
        next[field] = ''
      })
      return next
    })
    setError(null)
  }

  const scheduler = useExamSchedulerState({
    courseOfferingId: offeringId,
    excludeExamId: exam.id,
    initialPartialNumber: initialParsed.partialNumber,
    initialEvaluationType: initialParsed.evaluationType,
    initialHours: initialParsed.hours,
    initialMinutes: initialParsed.minutes,
    initialStartTime: initialParsed.startTime,
    initialExamDate: initialParsed.examDate,
    initialSelectedRoomIds: initialParsed.selectedRoomId
      ? [initialParsed.selectedRoomId]
      : [],
    initialSharedRoomEnabled: initialSharedFlag,
    onScheduleFieldChange: ClearFieldErrors,
  })

  useEffect(() => () => requestRef.current?.abort(), [])

  const resolvedExamName = hasModifiedTitleType
    ? BuildDefaultExamName(scheduler.evaluationType, scheduler.partialNumber)
    : exam.name ||
      BuildDefaultExamName(scheduler.evaluationType, scheduler.partialNumber)

  const isDirty =
    resolvedExamName !== exam.name ||
    scheduler.evaluationType !== initialParsed.evaluationType ||
    scheduler.durationMinutes !== exam.duration_minutes ||
    scheduler.startTime !== initialParsed.startTime ||
    scheduler.examDate !== initialParsed.examDate ||
    scheduler.primaryRoomId !== initialParsed.selectedRoomId ||
    scheduler.selectedRoomIds.length > 1 ||
    scheduler.isSharedRoomEnabled !== initialSharedFlag

  const guard = useExamNavigationGuard(isDirty, busy)

  const HandleSubmitUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      requestRef.current ||
      !isDirty ||
      needsReload ||
      !scheduler.roomsState.isReady
    ) {
      return
    }

    const validation = validateExamForm({
      name: resolvedExamName,
      exam_date: scheduler.examDate,
      start_time: scheduler.startTime,
      duration_minutes: scheduler.durationString,
      evaluation_type: scheduler.evaluationType,
      room_id: scheduler.primaryRoomId,
      rules: '',
    })

    if (!scheduler.areAllSelectedRoomsValid) {
      validation.room_id =
        'Selecciona un ambiente disponible o confirma el uso compartido para este horario.'
    }

    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    const controller = new AbortController()
    requestRef.current = controller
    setBusy(true)
    setError(null)

    try {
      await updateExam(
        exam,
        {
          name: resolvedExamName.trim(),
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
        } as Parameters<typeof updateExam>[1],
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
        scheduler.setSelectedRoomIds([])
        scheduler.roomsState.reload()
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false)
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  const canSubmit =
    !busy && !needsReload && isDirty && scheduler.isSelectionValid

  const activeErrorMessage =
    error ||
    scheduler.roomsState.roomError ||
    errors.room_id ||
    errors.exam_date ||
    errors.start_time ||
    errors.duration_minutes ||
    errors.name

  return (
    <form
      className={layoutStyles.schedulerForm}
      noValidate
      onSubmit={(event) => void HandleSubmitUpdate(event)}
      aria-busy={busy}
    >
      <ExamNavigationGuardBanner
        blocked={guard.blocked}
        isBusy={busy}
        stayLabel="Seguir editando"
        onStay={guard.stay}
        onDiscard={guard.discard}
      />

      <ExamSchedulerWorkspace
        scheduler={scheduler}
        examName={resolvedExamName}
        controlsDisabled={busy || needsReload}
        isSubmitting={busy}
        canSubmit={canSubmit}
        activeErrorMessage={activeErrorMessage}
        showRetryRoomsBtn={Boolean(scheduler.roomsState.roomError && !needsReload)}
        showReloadExamBtn={needsReload}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        onPartialChange={(nextPartial) => {
          scheduler.setPartialNumber(nextPartial)
          setHasModifiedTitleType(true)
          setError(null)
        }}
        onEvaluationTypeChange={(nextType) => {
          scheduler.setEvaluationType(nextType)
          setHasModifiedTitleType(true)
          setError(null)
        }}
        onRetryRooms={scheduler.roomsState.reload}
        onReloadExam={onReload}
        onCancel={() => void navigate(backTo)}
      />
    </form>
  )
}