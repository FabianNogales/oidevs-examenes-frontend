import type { EvaluationType } from '../../types/exam.types'
import type { useExamSchedulerState } from '../../hooks/useExamSchedulerState'
import { ExamParametersRibbon } from './ExamParametersRibbon'
import { ExamRoomsPanel } from './ExamRoomsPanel'
import { ExamTimeSelectorCard } from './ExamTimeSelectorCard'
import { ExamCalendarCard } from './ExamCalendarCard'
import { ExamSummaryFooter } from './ExamSummaryFooter'
import layoutStyles from './ExamSchedulerLayout.module.css'

export interface ExamSchedulerWorkspaceProps {
  scheduler: ReturnType<typeof useExamSchedulerState>
  examName: string
  controlsDisabled: boolean
  isSubmitting: boolean
  canSubmit?: boolean
  activeErrorMessage?: string | null
  showRetryRoomsBtn?: boolean
  showReloadExamBtn?: boolean
  submitLabel?: string
  submittingLabel?: string
  onPartialChange: (nextPartial: string) => void
  onEvaluationTypeChange: (nextType: EvaluationType) => void
  onRetryRooms?: () => void
  onReloadExam?: () => void
  onCancel: () => void
}

export function ExamSchedulerWorkspace({
  scheduler,
  examName,
  controlsDisabled,
  isSubmitting,
  canSubmit,
  activeErrorMessage,
  showRetryRoomsBtn = false,
  showReloadExamBtn = false,
  submitLabel,
  submittingLabel,
  onPartialChange,
  onEvaluationTypeChange,
  onRetryRooms,
  onReloadExam,
  onCancel,
}: ExamSchedulerWorkspaceProps) {
  return (
    <>
      <ExamParametersRibbon
        partialNumber={scheduler.partialNumber}
        evaluationType={scheduler.evaluationType}
        hours={scheduler.hours}
        minutes={scheduler.minutes}
        lastCreatedPartialNumber={scheduler.lastCreatedPartialNumber}
        disabled={controlsDisabled}
        onPartialNumberChange={onPartialChange}
        onEvaluationTypeChange={onEvaluationTypeChange}
        onDurationChange={scheduler.HandleDurationChange}
      />

      {activeErrorMessage ? (
        <section className={layoutStyles.errorAlertBanner} role="alert">
          <p>{activeErrorMessage}</p>
          {showRetryRoomsBtn || showReloadExamBtn ? (
            <div className={layoutStyles.inlineActionRow}>
              {showRetryRoomsBtn && onRetryRooms ? (
                <button
                  type="button"
                  className={layoutStyles.inlineSecondaryBtn}
                  onClick={onRetryRooms}
                  disabled={isSubmitting}
                >
                  Reintentar ambientes
                </button>
              ) : null}
              {showReloadExamBtn && onReloadExam ? (
                <button
                  type="button"
                  className={layoutStyles.inlinePrimaryBtn}
                  onClick={onReloadExam}
                >
                  Recargar examen y descartar cambios
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className={layoutStyles.workspaceGrid}>
        <div className={layoutStyles.timeArea}>
          <ExamTimeSelectorCard
            reservation={scheduler.reservation}
            examDurationMinutes={scheduler.durationMinutes}
            examEndTime={scheduler.examEndTime}
            disabled={controlsDisabled}
            onStartTimeChange={scheduler.HandleStartTimeChange}
          />
        </div>

        <div className={layoutStyles.roomsArea}>
          <ExamRoomsPanel
            rooms={scheduler.visibleRooms}
            availableRoomIds={scheduler.availableRoomIds}
            selectedRoomIds={scheduler.selectedRoomIds}
            onlyFreeRooms={scheduler.onlyFreeRooms}
            isMultipleRoomsEnabled={scheduler.isMultipleRoomsEnabled}
            roomSearchQuery={scheduler.roomSearchQuery}
            hasSchedule={scheduler.roomsState.hasSchedule}
            isLoadingRooms={scheduler.roomsState.isLoadingRooms}
            selectedDate={scheduler.examDate}
            startTime={scheduler.startTime}
            reservedMinutes={scheduler.reservation.reservedMinutes}
            formattedDateLabel={scheduler.formattedDateLabel}
            disabled={controlsDisabled}
            onToggleOnlyFreeRooms={scheduler.setOnlyFreeRooms}
            onToggleMultipleRooms={scheduler.HandleToggleMultipleRooms}
            onRoomSearchChange={scheduler.HandleRoomSearchChange}
            onSelectRoom={scheduler.HandleSelectRoomCard}
            onClearRooms={() => scheduler.setSelectedRoomIds([])}
          />
        </div>

        <div className={layoutStyles.calendarArea}>
          <ExamCalendarCard
            selectedDate={scheduler.examDate}
            selectedRoom={scheduler.primaryRoom}
            startTime={scheduler.startTime}
            reservedMinutes={scheduler.reservation.reservedMinutes}
            timezoneDate={scheduler.timezoneDate}
            academicTermRange={scheduler.academicTermRange}
            disabled={controlsDisabled}
            onSelectDate={scheduler.HandleSelectDate}
            onClearDate={() => scheduler.HandleSelectDate('')}
          />
        </div>
      </div>

      <ExamSummaryFooter
        examName={examName}
        hours={scheduler.hours}
        minutes={scheduler.minutes}
        selectedRooms={scheduler.selectedRooms}
        isSelectionValid={scheduler.isSelectionValid}
        canSubmit={canSubmit}
        formattedDateLabel={scheduler.formattedDateLabel}
        reservation={scheduler.reservation}
        isSubmitting={isSubmitting}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
        onCancel={onCancel}
      />
    </>
  )
}
