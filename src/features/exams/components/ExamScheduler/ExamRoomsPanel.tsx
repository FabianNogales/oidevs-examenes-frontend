import { Search, X } from 'lucide-react'
import { TextInput } from '@/shared/components/ui'
import type { Room } from '../../types/exam.types'
import { ROOM_SEARCH_MAX_LENGTH } from '../../utils/examScheduleFormatters'
import { ExamRoomCard } from './ExamRoomCard'
import styles from './ExamRoomsPanel.module.css'

export interface ExamRoomsPanelProps {
  rooms: Room[]
  availableRoomIds: ReadonlySet<string>
  selectedRoomIds: string[]
  onlyFreeRooms: boolean
  isMultipleRoomsEnabled: boolean
  roomSearchQuery: string
  hasSchedule: boolean
  isLoadingRooms: boolean
  selectedDate: string
  startTime: string
  reservedMinutes: number
  formattedDateLabel: string
  disabled: boolean
  onToggleOnlyFreeRooms: (checked: boolean) => void
  onToggleMultipleRooms: (checked: boolean) => void
  onRoomSearchChange: (rawValue: string) => void
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

interface RoomSearchBarProps {
  value: string
  disabled: boolean
  onChange: (rawValue: string) => void
}

function RoomSearchBar({ value, disabled, onChange }: RoomSearchBarProps) {
  return (
    <div className={styles.searchToolbar}>
      <div className={styles.searchInputWrap}>
        <Search className={styles.searchIcon} aria-hidden="true" />
        <TextInput
          id="exam-room-search"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={ROOM_SEARCH_MAX_LENGTH}
          value={value}
          disabled={disabled}
          placeholder="Buscar aula"
          aria-label="Buscar aula"
          className={styles.searchInput}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        {value.length > 0 ? (
          <button
            type="button"
            className={styles.searchClearBtn}
            disabled={disabled}
            onClick={() => onChange('')}
            aria-label="Limpiar búsqueda"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function ExamRoomsPanel({
  rooms,
  availableRoomIds,
  selectedRoomIds,
  onlyFreeRooms,
  isMultipleRoomsEnabled,
  roomSearchQuery,
  hasSchedule,
  isLoadingRooms,
  selectedDate,
  startTime,
  reservedMinutes,
  formattedDateLabel,
  disabled,
  onToggleOnlyFreeRooms,
  onToggleMultipleRooms,
  onRoomSearchChange,
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

      <RoomSearchBar
        value={roomSearchQuery}
        disabled={disabled}
        onChange={onRoomSearchChange}
      />

      <div className={styles.roomsStack}>
        {rooms.length === 0 ? (
          <div className={styles.emptyRoomsState}>
            {isLoadingRooms
              ? 'Consultando disponibilidad de aulas...'
              : roomSearchQuery
                ? `No se encontraron aulas que coincidan con «${roomSearchQuery}».`
                : 'No se encontraron aulas disponibles para el filtro seleccionado.'}
          </div>
        ) : (
          rooms.map((room, index) => {
            const roomIdString = String(room.id)
            return (
              <ExamRoomCard
                key={room.id}
                room={room}
                index={index}
                isSelected={selectedSet.has(roomIdString)}
                isAvailable={
                  hasVerifiedSchedule && availableRoomIds.has(roomIdString)
                }
                hasVerifiedSchedule={hasVerifiedSchedule}
                selectedDate={selectedDate}
                startTime={startTime}
                reservedMinutes={reservedMinutes}
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
