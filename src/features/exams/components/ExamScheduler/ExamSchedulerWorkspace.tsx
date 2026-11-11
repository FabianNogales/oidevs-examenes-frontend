import type { EvaluationType } from '../../types/exam.types'
import type { useExamSchedulerState } from '../../hooks/useExamSchedulerState'
import { ExamParametersRibbon } from './ExamParametersRibbon'
import { ExamRoomsPanel } from './ExamRoomsPanel'
import { ExamTimeSelectorCard } from './ExamTimeSelectorCard'
import { ExamCalendarCard } from './ExamCalendarCard'
import { ExamSummaryFooter } from './ExamSummaryFooter'
import { SharedRoomConsentModal } from './SharedRoomConsentModal'
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
      <SharedRoomConsentModal
        room={scheduler.pendingConsentRoom?.room ?? null}
        conflictingSlots={scheduler.pendingConsentRoom?.conflictingSlots ?? []}
        onCancel={() => scheduler.setPendingConsentRoom(null)}
        onConfirmConsent={scheduler.HandleConfirmConsentModal}
      />

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
        <ExamRoomsPanel
          rooms={scheduler.visibleRooms}
          availableRoomIds={scheduler.availableRoomIds}
          selectedRoomIds={scheduler.selectedRoomIds}
          onlyFreeRooms={scheduler.onlyFreeRooms}
          isSharedRoomEnabled={scheduler.isSharedRoomEnabled}
          isMultipleRoomsEnabled={scheduler.isMultipleRoomsEnabled}
          eligibleStudentsCount={scheduler.eligibleStudentsCount}
          targetCapacityWithMargin={scheduler.targetCapacityWithMargin}
          hasSchedule={scheduler.roomsState.hasSchedule}
          isLoadingRooms={scheduler.roomsState.isLoadingRooms}
          selectedDate={scheduler.examDate}
          startTime={scheduler.startTime}
          durationMinutes={scheduler.durationMinutes}
          formattedDateLabel={scheduler.formattedDateLabel}
          disabled={controlsDisabled}
          onToggleOnlyFreeRooms={scheduler.setOnlyFreeRooms}
          onToggleSharedRoom={scheduler.setIsSharedRoomEnabled}
          onToggleMultipleRooms={scheduler.HandleToggleMultipleRooms}
          onSelectRoom={scheduler.HandleSelectRoomCard}
          onClearRooms={() => scheduler.setSelectedRoomIds([])}
        />

        <div className={layoutStyles.rightColumnStack}>
          <ExamTimeSelectorCard
            startTime={scheduler.startTime}
            endTimeFormatted={scheduler.endTimeFormatted}
            disabled={controlsDisabled}
            onStartTimeChange={scheduler.HandleStartTimeChange}
          />

          <ExamCalendarCard
            selectedDate={scheduler.examDate}
            selectedRoom={scheduler.primaryRoom}
            startTime={scheduler.startTime}
            durationMinutes={scheduler.durationMinutes}
            timezoneDate={scheduler.timezoneDate}
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
        isSharedRoomEnabled={scheduler.isSharedRoomEnabled}
        isSelectionValid={scheduler.isSelectionValid}
        canSubmit={canSubmit}
        formattedDateLabel={scheduler.formattedDateLabel}
        startTime={scheduler.startTime}
        endTimeFormatted={scheduler.endTimeFormatted}
        isSubmitting={isSubmitting}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
        onCancel={onCancel}
      />
    </>
  )
}