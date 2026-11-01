import { useEffect, useMemo, useState } from 'react'
import { useAvailableRooms } from './useAvailableRooms'
import { getRoomsWithMeta } from '../api/teacherExamsApi'
import type { EvaluationType, Room, RoomBusySlot } from '../types/exam.types'
import {
  CalculateEndTime,
  CalculateTargetRoomCapacity,
  EvaluateRoomSharingStatus,
  FormatShortDateSpanish,
  GetCurrentTimezoneDate,
  SortRoomsByBestFitCapacity,
} from '../utils/examScheduleFormatters'

export interface UseExamSchedulerStateParams {
  courseOfferingId?: number | string
  excludeExamId?: number
  autoDetectNextPartial?: boolean
  initialPartialNumber?: string
  initialEvaluationType?: EvaluationType
  initialHours?: number
  initialMinutes?: number
  initialStartTime?: string
  initialExamDate?: string
  initialSelectedRoomIds?: string[]
  initialSharedRoomEnabled?: boolean
  initialEligibleStudentsCount?: number
  onScheduleFieldChange?: (clearedFields: string[]) => void
}

// Hook centralizado para el estado de programación y selección de ambientes
export function useExamSchedulerState({
  courseOfferingId,
  excludeExamId,
  autoDetectNextPartial = false,
  initialPartialNumber = '1',
  initialEvaluationType = 'partial',
  initialHours = 1,
  initialMinutes = 30,
  initialStartTime = '09:45',
  initialExamDate = '',
  initialSelectedRoomIds = [],
  initialSharedRoomEnabled = false,
  initialEligibleStudentsCount = 0,
  onScheduleFieldChange,
}: UseExamSchedulerStateParams) {
  const timezoneDate = useMemo(() => GetCurrentTimezoneDate(), [])

  const [partialNumber, setPartialNumber] = useState<string>(initialPartialNumber)
  const [defaultPartialNumber, setDefaultPartialNumber] =
    useState<string>(initialPartialNumber)
  const [lastCreatedPartialNumber, setLastCreatedPartialNumber] =
    useState<number>(0)
  const [evaluationType, setEvaluationType] = useState<EvaluationType>(
    initialEvaluationType,
  )
  const [hours, setHours] = useState<number>(initialHours)
  const [minutes, setMinutes] = useState<number>(initialMinutes)
  const [startTime, setStartTime] = useState<string>(initialStartTime)
  const [examDate, setExamDate] = useState<string>(initialExamDate)

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(
    initialSelectedRoomIds,
  )
  const [consentedSharedRoomIds, setConsentedSharedRoomIds] = useState<
    Set<string>
  >(() => new Set())
  const [isSharedRoomEnabled, setIsSharedRoomEnabled] = useState<boolean>(
    initialSharedRoomEnabled,
  )
  const [isMultipleRoomsEnabled, setIsMultipleRoomsEnabled] =
    useState<boolean>(false)
  const [onlyFreeRooms, setOnlyFreeRooms] = useState<boolean>(false)
  const [pendingConsentRoom, setPendingConsentRoom] = useState<{
    room: Room
    conflictingSlots: RoomBusySlot[]
  } | null>(null)

  const [eligibleStudentsCount, setEligibleStudentsCount] = useState<number>(
    initialEligibleStudentsCount,
  )
  const [catalogRooms, setCatalogRooms] = useState<Room[]>([])

  const durationMinutes = Math.max(5, hours * 60 + minutes)
  const durationString = String(durationMinutes)
  const endTimeFormatted = CalculateEndTime(startTime, durationMinutes)
  const formattedDateLabel = FormatShortDateSpanish(examDate)

  useEffect(() => {
    const controller = new AbortController()
    void getRoomsWithMeta(
      courseOfferingId ? { course_offering_id: courseOfferingId } : undefined,
      controller.signal,
    )
      .then(({ rooms: roomsList, meta }) => {
        if (controller.signal.aborted) return
        setCatalogRooms(roomsList)

        if (!meta) return
        if (meta.eligible_students_count > 0) {
          setEligibleStudentsCount(meta.eligible_students_count)
        }
        if (autoDetectNextPartial) {
          const nextNum = String(
            Math.min(6, Math.max(1, meta.next_partial_number || 1)),
          )
          setPartialNumber(nextNum)
          setDefaultPartialNumber(nextNum)
          setLastCreatedPartialNumber(meta.last_partial_number || 0)
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [courseOfferingId, autoDetectNextPartial])

  const targetCapacityWithMargin = useMemo(
    () => CalculateTargetRoomCapacity(eligibleStudentsCount),
    [eligibleStudentsCount],
  )

  const roomsState = useAvailableRooms(
    true,
    examDate,
    startTime,
    durationString,
    excludeExamId,
  )

  const availableRoomIds = useMemo(
    () => new Set(roomsState.rooms.map((room) => String(room.id))),
    [roomsState.rooms],
  )

  const sortedMergedRooms = useMemo<Room[]>(() => {
    const baseList = catalogRooms.length > 0 ? catalogRooms : roomsState.rooms
    const availableById = new Map(roomsState.rooms.map((item) => [item.id, item]))
    const combined = baseList.map((room) => availableById.get(room.id) ?? room)
    return SortRoomsByBestFitCapacity(combined, targetCapacityWithMargin)
  }, [catalogRooms, roomsState.rooms, targetCapacityWithMargin])

  const visibleRooms = useMemo(() => {
    if (!onlyFreeRooms || !roomsState.hasSchedule) return sortedMergedRooms
    return sortedMergedRooms.filter((room) =>
      availableRoomIds.has(String(room.id)),
    )
  }, [sortedMergedRooms, onlyFreeRooms, roomsState.hasSchedule, availableRoomIds])

  const selectedRooms = useMemo(
    () =>
      sortedMergedRooms.filter((room) =>
        selectedRoomIds.includes(String(room.id)),
      ),
    [sortedMergedRooms, selectedRoomIds],
  )

  const primaryRoom = selectedRooms[0] ?? null
  const primaryRoomId = primaryRoom ? String(primaryRoom.id) : ''

  const areAllSelectedRoomsValid = useMemo(() => {
    if (
      selectedRoomIds.length === 0 ||
      !roomsState.hasSchedule ||
      !roomsState.isReady
    ) {
      return false
    }
    return selectedRoomIds.every((idStr) => {
      if (availableRoomIds.has(idStr) || consentedSharedRoomIds.has(idStr)) {
        return true
      }
      const roomObj = sortedMergedRooms.find((r) => String(r.id) === idStr)
      if (!roomObj) return false
      return EvaluateRoomSharingStatus(
        roomObj,
        examDate,
        startTime,
        durationMinutes,
      ).isMarkedAsSharedByOtherTeacher
    })
  }, [
    selectedRoomIds,
    roomsState.hasSchedule,
    roomsState.isReady,
    availableRoomIds,
    consentedSharedRoomIds,
    sortedMergedRooms,
    examDate,
    startTime,
    durationMinutes,
  ])

  const isSelectionValid =
    Boolean(examDate) &&
    Boolean(startTime) &&
    selectedRoomIds.length > 0 &&
    areAllSelectedRoomsValid

  const HandleDurationChange = (nextHours: number, nextMinutes: number) => {
    setHours(Math.max(0, Math.min(12, nextHours)))
    setMinutes(Math.max(0, Math.min(59, nextMinutes)))
    onScheduleFieldChange?.([
      'duration_minutes',
      'room_id',
      'exam_date',
      'start_time',
    ])
  }

  const ToggleRoomInSelection = (roomIdString: string) => {
    setSelectedRoomIds((current) => {
      if (current.includes(roomIdString)) {
        return current.filter((id) => id !== roomIdString)
      }
      return isMultipleRoomsEnabled
        ? [...current, roomIdString]
        : [roomIdString]
    })
    onScheduleFieldChange?.(['room_id'])
  }

  const HandleSelectRoomCard = (room: Room) => {
    const roomIdStr = String(room.id)
    if (selectedRoomIds.includes(roomIdStr)) {
      ToggleRoomInSelection(roomIdStr)
      return
    }

    if (roomsState.hasSchedule && !availableRoomIds.has(roomIdStr)) {
      const sharingStatus = EvaluateRoomSharingStatus(
        room,
        examDate,
        startTime,
        durationMinutes,
      )

      if (sharingStatus.isMarkedAsSharedByOtherTeacher) {
        setIsSharedRoomEnabled(true)
        ToggleRoomInSelection(roomIdStr)
        return
      }

      if (!consentedSharedRoomIds.has(roomIdStr)) {
        setPendingConsentRoom({
          room,
          conflictingSlots:
            sharingStatus.conflictingSlots.length > 0
              ? sharingStatus.conflictingSlots
              : [
                  {
                    start: startTime,
                    end: endTimeFormatted,
                    exam_name: 'Reserva existente en el bloque',
                  },
                ],
        })
        return
      }
    }

    ToggleRoomInSelection(roomIdStr)
  }

  const HandleConfirmConsentModal = (room: Room) => {
    const roomIdStr = String(room.id)
    setConsentedSharedRoomIds((prev) => new Set(prev).add(roomIdStr))
    setIsSharedRoomEnabled(true)
    setPendingConsentRoom(null)
    ToggleRoomInSelection(roomIdStr)
  }

  const HandleToggleMultipleRooms = (enabled: boolean) => {
    setIsMultipleRoomsEnabled(enabled)
    if (!enabled && selectedRoomIds.length > 1) {
      setSelectedRoomIds([selectedRoomIds[0]])
    }
  }

  const HandleSelectDate = (isoDate: string) => {
    setExamDate((current) => (current === isoDate ? '' : isoDate))
    onScheduleFieldChange?.(['exam_date', 'start_time', 'room_id'])
  }

  const HandleStartTimeChange = (nextTime: string) => {
    setStartTime(nextTime)
    onScheduleFieldChange?.(['start_time', 'exam_date', 'room_id'])
  }

  return {
    timezoneDate,
    partialNumber,
    defaultPartialNumber,
    lastCreatedPartialNumber,
    evaluationType,
    hours,
    minutes,
    durationMinutes,
    durationString,
    startTime,
    endTimeFormatted,
    examDate,
    formattedDateLabel,
    selectedRoomIds,
    selectedRooms,
    primaryRoom,
    primaryRoomId,
    consentedSharedRoomIds,
    isSharedRoomEnabled,
    isMultipleRoomsEnabled,
    onlyFreeRooms,
    pendingConsentRoom,
    eligibleStudentsCount,
    targetCapacityWithMargin,
    visibleRooms,
    availableRoomIds,
    roomsState,
    areAllSelectedRoomsValid,
    isSelectionValid,
    setPartialNumber,
    setEvaluationType,
    setSelectedRoomIds,
    setOnlyFreeRooms,
    setIsSharedRoomEnabled,
    setPendingConsentRoom,
    HandleDurationChange,
    HandleSelectRoomCard,
    HandleConfirmConsentModal,
    HandleToggleMultipleRooms,
    HandleSelectDate,
    HandleStartTimeChange,
  }
}