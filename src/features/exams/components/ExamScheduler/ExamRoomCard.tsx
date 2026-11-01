import type { Room, RoomBusySlot } from '../../types/exam.types'
import { EvaluateRoomSharingStatus } from '../../utils/examScheduleFormatters'
import styles from './ExamRoomCard.module.css'

export interface ExamRoomCardProps {
  room: Room
  index: number
  isSelected: boolean
  isAvailable: boolean
  isRecommendedForCapacity: boolean
  hasVerifiedSchedule: boolean
  selectedDate: string
  startTime: string
  durationMinutes: number
  formattedDateLabel: string
  disabled: boolean
  onSelectRoom: (room: Room) => void
}

function ResolveRoomBadge(
  isSelected: boolean,
  hasVerifiedSchedule: boolean,
  isAvailable: boolean,
  isSharedByOther: boolean,
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
  if (isSharedByOther) {
    return {
      badgeClass: styles.roomStatusBadgeValid,
      badgeText: 'Disponible para compartir',
    }
  }
  return {
    badgeClass: styles.roomStatusBadgeBusy,
    badgeText: 'Ocupada • Clic para compartir',
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
        className={
          slot.is_shared
            ? styles.sharedSlotChip
            : `${styles.slotMetaChip} ${
                !isAvailable ? styles.slotMetaChipConflict : ''
              }`
        }
      >
        {slot.is_shared ? 'Compartida ' : 'Ocupado '}
        {slot.start}–{slot.end}
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
      Horario reservado (requiere consentimiento para compartir)
    </span>
  )
}

export function ExamRoomCard({
  room,
  index,
  isSelected,
  isAvailable,
  isRecommendedForCapacity,
  hasVerifiedSchedule,
  selectedDate,
  startTime,
  durationMinutes,
  formattedDateLabel,
  disabled,
  onSelectRoom,
}: ExamRoomCardProps) {
  const sharingEval = EvaluateRoomSharingStatus(
    room,
    selectedDate,
    startTime,
    durationMinutes,
  )

  const { badgeClass, badgeText } = ResolveRoomBadge(
    isSelected,
    hasVerifiedSchedule,
    isAvailable,
    sharingEval.isMarkedAsSharedByOtherTeacher,
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
      disabled={disabled}
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
          {isRecommendedForCapacity ? (
            <span className={styles.recommendedBadge}>★ Adecuada a tu cupo</span>
          ) : null}
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
            room.busy_slots ?? [],
            isAvailable,
            isSelected,
            formattedDateLabel,
          )}
        </div>
      </div>
    </button>
  )
}