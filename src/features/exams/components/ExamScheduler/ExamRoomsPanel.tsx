import type { Room } from '../../types/exam.types'
import { ExamRoomCard } from './ExamRoomCard'
import styles from './ExamRoomsPanel.module.css'

export interface ExamRoomsPanelProps {
  rooms: Room[]
  availableRoomIds: ReadonlySet<string>
  selectedRoomIds: string[]
  onlyFreeRooms: boolean
  isSharedRoomEnabled: boolean
  isMultipleRoomsEnabled: boolean
  eligibleStudentsCount: number
  targetCapacityWithMargin: number
  hasSchedule: boolean
  isLoadingRooms: boolean
  selectedDate: string
  startTime: string
  durationMinutes: number
  formattedDateLabel: string
  disabled: boolean
  onToggleOnlyFreeRooms: (checked: boolean) => void
  onToggleSharedRoom: (checked: boolean) => void
  onToggleMultipleRooms: (checked: boolean) => void
  onSelectRoom: (room: Room) => void
  onClearRooms: () => void
}

interface ToolbarToggleSwitchProps {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}

function ToolbarToggleSwitch({
  label,
  checked,
  disabled,
  onChange,
}: ToolbarToggleSwitchProps) {
  return (
    <label className={styles.toggleSwitchLabel}>
      <input
        type="checkbox"
        className={styles.toggleInput}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.toggleTrack}>
        <span className={styles.toggleThumb} />
      </span>
      <span>{label}</span>
    </label>
  )
}

export function ExamRoomsPanel({
  rooms,
  availableRoomIds,
  selectedRoomIds,
  onlyFreeRooms,
  isSharedRoomEnabled,
  isMultipleRoomsEnabled,
  eligibleStudentsCount,
  targetCapacityWithMargin,
  hasSchedule,
  isLoadingRooms,
  selectedDate,
  startTime,
  durationMinutes,
  formattedDateLabel,
  disabled,
  onToggleOnlyFreeRooms,
  onToggleSharedRoom,
  onToggleMultipleRooms,
  onSelectRoom,
  onClearRooms,
}: ExamRoomsPanelProps) {
  const hasVerifiedSchedule = hasSchedule && !isLoadingRooms
  const selectedSet = new Set(selectedRoomIds)

  const counterText = hasSchedule
    ? isLoadingRooms
      ? 'Verificando...'
      : `${availableRoomIds.size} disponibles`
    : `${rooms.length} ambientes`

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeaderRow}>
        <div className={styles.panelTitleGroup}>
          <h2>Aulas</h2>
          <span
            className={
              hasVerifiedSchedule
                ? styles.counterBadgeValid
                : styles.counterBadgeNeutral
            }
          >
            {counterText}
          </span>

          {targetCapacityWithMargin > 0 ? (
            <span className={styles.capacityInfoBanner}>
              Habilitados: {eligibleStudentsCount} (+10 margen ={' '}
              <strong>{targetCapacityWithMargin} plazas sug.</strong>)
            </span>
          ) : null}
        </div>

        <div className={styles.panelControlsGroup}>
          <button
            type="button"
            className={styles.clearSelectionBtn}
            disabled={selectedRoomIds.length === 0 || disabled}
            onClick={onClearRooms}
          >
            ✕ Quitar {selectedRoomIds.length > 1 ? 'aulas' : 'aula'}
          </button>
        </div>
      </div>

      <div className={styles.togglesToolbar}>
        <div className={styles.togglesGroup}>
          <ToolbarToggleSwitch
            label="Aula compartida"
            checked={isSharedRoomEnabled}
            disabled={disabled}
            onChange={onToggleSharedRoom}
          />
          <ToolbarToggleSwitch
            label="Aulas múltiples"
            checked={isMultipleRoomsEnabled}
            disabled={disabled}
            onChange={onToggleMultipleRooms}
          />
        </div>

        <ToolbarToggleSwitch
          label="Solo libres"
          checked={onlyFreeRooms}
          disabled={disabled}
          onChange={onToggleOnlyFreeRooms}
        />
      </div>

      <div className={styles.roomsStack}>
        {rooms.length === 0 ? (
          <div className={styles.emptyRoomsState}>
            {isLoadingRooms
              ? 'Consultando disponibilidad de aulas...'
              : 'No se encontraron aulas disponibles para el filtro seleccionado.'}
          </div>
        ) : (
          rooms.map((room, index) => {
            const roomIdString = String(room.id)
            const roomCap = Number(room.capacity) || 0
            return (
              <ExamRoomCard
                key={room.id}
                room={room}
                index={index}
                isSelected={selectedSet.has(roomIdString)}
                isAvailable={
                  hasVerifiedSchedule && availableRoomIds.has(roomIdString)
                }
                isRecommendedForCapacity={
                  targetCapacityWithMargin > 0 &&
                  index === 0 &&
                  roomCap >= targetCapacityWithMargin
                }
                hasVerifiedSchedule={hasVerifiedSchedule}
                selectedDate={selectedDate}
                startTime={startTime}
                durationMinutes={durationMinutes}
                formattedDateLabel={formattedDateLabel}
                disabled={disabled}
                onSelectRoom={onSelectRoom}
              />
            )
          })
        )}
      </div>
    </div>
  )
}