import type { Room, RoomBusySlot } from '../../types/exam.types'
import { GetRoomConflictingSlots } from '../../utils/examScheduleFormatters'
import styles from './ExamRoomCard.module.css'

export interface ExamRoomCardProps {
  room: Room
  index: number
  isSelected: boolean
  isAvailable: boolean
  hasVerifiedSchedule: boolean
  selectedDate: string
  startTime: string
  reservedMinutes: number
  formattedDateLabel: string
  disabled: boolean
  onSelectRoom: (room: Room) => void
}

function ResolveRoomBadge(
  isSelected: boolean,
  hasVerifiedSchedule: boolean,
  isAvailable: boolean,
): { badgeClass: string; badgeText: string } {
  if (isSelected) {
    return {
      badgeClass: styles.roomStatusBadgeSelected,
      badgeText: '✓ Aula seleccionada',
    }
  }
  if (!hasVerifiedSchedule) {
    return {
      badgeClass: styles.roomStatusBadgeNeutral,
      badgeText: 'Ver días libres',
    }
  }
  if (isAvailable) {
    return {
      badgeClass: styles.roomStatusBadgeValid,
      badgeText: '✓ Disponible',
    }
  }
  return {
    badgeClass: styles.roomStatusBadgeBusy,
    badgeText: 'Ocupada',
  }
}

function RenderRoomSlotsStatus(
  hasVerifiedSchedule: boolean,
  busySlots: RoomBusySlot[],
  isAvailable: boolean,
  isSelected: boolean,
  formattedDateLabel: string,
) {
  if (!hasVerifiedSchedule) {
    return (
      <span className={styles.slotMetaChip}>
        {isSelected
          ? 'Mostrando sus fechas libres en verde en el calendario'
          : 'Haz clic para ver sus días disponibles'}
      </span>
    )
  }

  if (busySlots.length > 0) {
    return busySlots.map((slot, slotIdx) => (
      <span
        key={`${slot.start}-${slotIdx}`}
        className={`${styles.slotMetaChip} ${
          !isAvailable ? styles.slotMetaChipConflict : ''
        }`}
      >
        Ocupado {slot.start}–{slot.end}
      </span>
    ))
  }

  if (isAvailable) {
    return (
      <span className={styles.slotMetaChip}>
        Libre en este bloque ({formattedDateLabel})
      </span>
    )
  }

  return (
    <span className={`${styles.slotMetaChip} ${styles.slotMetaChipConflict}`}>
      Horario reservado en este bloque
    </span>
  )
}

export function ExamRoomCard({
  room,
  index,
  isSelected,
  isAvailable,
  hasVerifiedSchedule,
  selectedDate,
  startTime,
  reservedMinutes,
  formattedDateLabel,
  disabled,
  onSelectRoom,
}: ExamRoomCardProps) {
  const conflictingSlots = GetRoomConflictingSlots(
    room,
    selectedDate,
    startTime,
    reservedMinutes,
  )
  const displaySlots =
    conflictingSlots.length > 0 ? conflictingSlots : (room.busy_slots ?? [])
  const isUnavailable = hasVerifiedSchedule && !isAvailable && !isSelected

  const { badgeClass, badgeText } = ResolveRoomBadge(
    isSelected,
    hasVerifiedSchedule,
    isAvailable,
  )

  const cardStateClasses = [
    styles.roomCard,
    hasVerifiedSchedule && isAvailable ? styles.roomCardVerifiedAvailable : '',
    hasVerifiedSchedule && !isAvailable ? styles.roomCardBusy : '',
    isSelected ? styles.roomCardSelected : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      disabled={disabled || isUnavailable}
      className={cardStateClasses}
      onClick={() => onSelectRoom(room)}
    >
      <div className={styles.roomCardHeader}>
        <div className={styles.roomIdentityGroup}>
          <span className={styles.roomIndexBadge}>{index + 1}</span>
          <span className={styles.roomNameText}>{room.name || room.code}</span>
          <span className={styles.roomCapacityTag}>
            {room.capacity ? `${room.capacity} plazas` : room.code}
          </span>
        </div>

        <span className={`${styles.roomStatusBadge} ${badgeClass}`}>
          <span className={styles.statusDotIndicator} />
          <span>{badgeText}</span>
        </span>
      </div>

      <div className={styles.roomCardBody}>
        <span className={styles.roomLocationText}>
          {[room.code, room.location, room.floor].filter(Boolean).join(' • ')}
        </span>

        <div className={styles.roomSlotsRow}>
          {RenderRoomSlotsStatus(
            hasVerifiedSchedule,
            displaySlots,
            isAvailable,
            isSelected,
            formattedDateLabel,
          )}
        </div>
      </div>
    </button>
  )
}
