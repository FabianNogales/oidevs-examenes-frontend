import { useEffect, useMemo, useState } from 'react'
import { useAvailableRooms } from './useAvailableRooms'
import { getRoomsWithMeta } from '../api/teacherExamsApi'
import type { EvaluationType, Room } from '../types/exam.types'
import {
  CalculateEndTime,
  CalculateRequiredBlocks,
  ClampExamDuration,
  DEFAULT_EXAM_START_TIME,
  FindReservationBlockIndex,
  FormatShortDateSpanish,
  GetCurrentTimezoneDate,
  GetLatestStartBlockIndex,
  IsDateWithinAcademicTerm,
  ROOM_RESERVATION_BLOCKS,
  ResolveReservationWindow,
  RoomMatchesSearch,
  SanitizeRoomSearchQuery,
  type AcademicTermRange,
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
  onScheduleFieldChange?: (clearedFields: string[]) => void
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Hook centralizado para el estado de programación y selección de ambientes
export function useExamSchedulerState({
  courseOfferingId,
  excludeExamId,
  autoDetectNextPartial = false,
  initialPartialNumber = '1',
  initialEvaluationType = 'partial',
  initialHours = 1,
  initialMinutes = 30,
  initialStartTime = DEFAULT_EXAM_START_TIME,
  initialExamDate = '',
  initialSelectedRoomIds = [],
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
  const [isMultipleRoomsEnabled, setIsMultipleRoomsEnabled] =
    useState<boolean>(false)
  const [onlyFreeRooms, setOnlyFreeRooms] = useState<boolean>(false)
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('')

  const [catalogRooms, setCatalogRooms] = useState<Room[]>([])
  const [academicTermRange, setAcademicTermRange] =
    useState<AcademicTermRange | null>(null)

  const durationMinutes = ClampExamDuration(hours * 60 + minutes)
  const durationString = String(durationMinutes)
  const reservation = ResolveReservationWindow(startTime, durationMinutes)
  const reservedDurationString = String(reservation.reservedMinutes)
  const examEndTime = CalculateEndTime(startTime, durationMinutes)
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
        const term = meta.academic_term
        if (
          term &&
          ISO_DATE_PATTERN.test(term.start_date) &&
          ISO_DATE_PATTERN.test(term.end_date)
        ) {
          setAcademicTermRange({
            name: term.name,
            startDate: term.start_date,
            endDate: term.end_date,
          })
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

  // La disponibilidad se consulta por el bloque completo de periodos reservados.
  const roomsState = useAvailableRooms(
    true,
    examDate,
    startTime,
    reservedDurationString,
    excludeExamId,
  )

  const availableRoomIds = useMemo(
    () => new Set(roomsState.rooms.map((room) => String(room.id))),
    [roomsState.rooms],
  )

  const mergedRooms = useMemo<Room[]>(() => {
    const baseList = catalogRooms.length > 0 ? catalogRooms : roomsState.rooms
    const availableById = new Map(roomsState.rooms.map((item) => [item.id, item]))
    return baseList.map((room) => availableById.get(room.id) ?? room)
  }, [catalogRooms, roomsState.rooms])

  const visibleRooms = useMemo(() => {
    return mergedRooms.filter((room) => {
      if (!RoomMatchesSearch(room, roomSearchQuery)) return false
      if (onlyFreeRooms && roomsState.hasSchedule) {
        return availableRoomIds.has(String(room.id))
      }
      return true
    })
  }, [
    mergedRooms,
    roomSearchQuery,
    onlyFreeRooms,
    roomsState.hasSchedule,
    availableRoomIds,
  ])

  const selectedRooms = useMemo(
    () =>
      mergedRooms.filter((room) =>
        selectedRoomIds.includes(String(room.id)),
      ),
    [mergedRooms, selectedRoomIds],
  )

  const primaryRoom = selectedRooms[0] ?? null
  const primaryRoomId = primaryRoom ? String(primaryRoom.id) : ''

  // Sin aula compartida: toda aula elegida debe estar libre en el bloque reservado.
  const areAllSelectedRoomsValid =
    selectedRoomIds.length > 0 &&
    roomsState.hasSchedule &&
    roomsState.isReady &&
    selectedRoomIds.every((idStr) => availableRoomIds.has(idStr))

  const isExamDateWithinTerm =
    Boolean(examDate) && IsDateWithinAcademicTerm(examDate, academicTermRange)

  const isSelectionValid =
    Boolean(examDate) &&
    isExamDateWithinTerm &&
    Boolean(startTime) &&
    reservation.isValid &&
    selectedRoomIds.length > 0 &&
    areAllSelectedRoomsValid

  const HandleDurationChange = (nextHours: number, nextMinutes: number) => {
    const safeHours = Math.max(0, Math.min(23, nextHours))
    const safeMinutes = Math.max(0, Math.min(59, nextMinutes))
    const total = ClampExamDuration(safeHours * 60 + safeMinutes)
    setHours(Math.floor(total / 60))
    setMinutes(total % 60)

    // Si el examen ya no cabe antes de las 21:45, se mueve al último periodo válido.
    const latestIndex = GetLatestStartBlockIndex(CalculateRequiredBlocks(total))
    if (FindReservationBlockIndex(startTime) > latestIndex) {
      setStartTime(ROOM_RESERVATION_BLOCKS[latestIndex].start)
    }

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
    // Un aula ocupada en el bloque elegido no puede reservarse.
    if (roomsState.hasSchedule && !availableRoomIds.has(roomIdStr)) return
    ToggleRoomInSelection(roomIdStr)
  }

  const HandleToggleMultipleRooms = (enabled: boolean) => {
    setIsMultipleRoomsEnabled(enabled)
    if (!enabled && selectedRoomIds.length > 1) {
      setSelectedRoomIds([selectedRoomIds[0]])
    }
  }

  const HandleSelectDate = (isoDate: string) => {
    if (isoDate && !IsDateWithinAcademicTerm(isoDate, academicTermRange)) return
    setExamDate((current) => (current === isoDate ? '' : isoDate))
    onScheduleFieldChange?.(['exam_date', 'start_time', 'room_id'])
  }

  const HandleStartTimeChange = (nextTime: string) => {
    const index = FindReservationBlockIndex(nextTime)
    if (index < 0) return
    if (index > GetLatestStartBlockIndex(reservation.blockCount)) return
    setStartTime(nextTime)
    onScheduleFieldChange?.(['start_time', 'exam_date', 'room_id'])
  }

  const HandleRoomSearchChange = (rawValue: string) => {
    setRoomSearchQuery(SanitizeRoomSearchQuery(rawValue))
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
    examEndTime,
    reservation,
    examDate,
    formattedDateLabel,
    academicTermRange,
    isExamDateWithinTerm,
    selectedRoomIds,
    selectedRooms,
    primaryRoom,
    primaryRoomId,
    isMultipleRoomsEnabled,
    onlyFreeRooms,
    roomSearchQuery,
    visibleRooms,
    availableRoomIds,
    roomsState,
    areAllSelectedRoomsValid,
    isSelectionValid,
    setPartialNumber,
    setEvaluationType,
    setSelectedRoomIds,
    setOnlyFreeRooms,
    HandleDurationChange,
    HandleSelectRoomCard,
    HandleToggleMultipleRooms,
    HandleSelectDate,
    HandleStartTimeChange,
    HandleRoomSearchChange,
  }
}
