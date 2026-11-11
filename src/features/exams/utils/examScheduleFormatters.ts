import type { EvaluationType, Room, RoomBusySlot } from '../types/exam.types'

export const EXAM_SAFETY_MARGIN_STUDENTS = 10
export const MAX_ALLOWED_PARTIAL_NUMBER = 6

export interface CalendarDayCell {
  key: string
  dayNumber: number
  isoDate: string
  isOutsideMonth: boolean
  isPastDate: boolean
  isToday: boolean
}

export interface TimezoneDateInfo {
  year: number
  monthIndex: number
  day: number
  todayIso: string
  timeZoneName: string
}

export interface InitialSchedulerState {
  partialNumber: string
  evaluationType: EvaluationType
  hours: number
  minutes: number
  startTime: string
  examDate: string
  selectedRoomId: string
}

export interface RoomSharingEvaluation {
  hasTimeConflict: boolean
  conflictingSlots: RoomBusySlot[]
  isMarkedAsSharedByOtherTeacher: boolean
  requiresConsentModal: boolean
}

const SPANISH_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

export function GetCurrentTimezoneDate(customTimeZone?: string): TimezoneDateInfo {
  const resolvedZone =
    customTimeZone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'America/La_Paz'

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolvedZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''

  const yearStr = getPart('year')
  const monthStr = getPart('month')
  const dayStr = getPart('day')

  return {
    year: Number(yearStr),
    monthIndex: Number(monthStr) - 1,
    day: Number(dayStr),
    todayIso: `${yearStr}-${monthStr}-${dayStr}`,
    timeZoneName: resolvedZone,
  }
}

function CreateCalendarCell(
  key: string,
  dayNumber: number,
  isoDate = '',
  todayIso = '',
): CalendarDayCell {
  const isOutsideMonth = isoDate === ''
  return {
    key,
    dayNumber,
    isoDate,
    isOutsideMonth,
    isPastDate: isOutsideMonth || isoDate < todayIso,
    isToday: !isOutsideMonth && isoDate === todayIso,
  }
}

export function BuildCalendarMonthCells(
  year: number,
  monthIndex: number,
  todayIso: string,
): CalendarDayCell[] {
  const startWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate()
  const cells: CalendarDayCell[] = []

  for (let index = startWeekday - 1; index >= 0; index--) {
    const dayNum = daysInPrevMonth - index
    cells.push(CreateCalendarCell(`prev-${year}-${monthIndex}-${dayNum}`, dayNum))
  }

  const monthPadded = String(monthIndex + 1).padStart(2, '0')
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const isoDate = `${year}-${monthPadded}-${String(dayNum).padStart(2, '0')}`
    cells.push(CreateCalendarCell(isoDate, dayNum, isoDate, todayIso))
  }

  while (cells.length < 42) {
    const nextDay = cells.length - (startWeekday + daysInMonth) + 1
    cells.push(CreateCalendarCell(`next-${year}-${monthIndex}-${nextDay}`, nextDay))
  }

  return cells
}

export function GetSpanishMonthName(monthIndex: number): string {
  return SPANISH_MONTHS[monthIndex] ?? ''
}

function ConvertTimeToMinutes(timeText: string): number {
  const [hoursStr, minutesStr] = timeText.split(':')
  return (Number(hoursStr) || 0) * 60 + (Number(minutesStr) || 0)
}

function GetConflictingSlots(
  slots: RoomBusySlot[],
  startTime: string,
  durationMinutes: number,
): RoomBusySlot[] {
  const requestedStart = ConvertTimeToMinutes(startTime)
  const requestedEnd = requestedStart + Math.max(durationMinutes, 1)

  return slots.filter((slot) => {
    const slotStart = ConvertTimeToMinutes(slot.start)
    const slotEnd = ConvertTimeToMinutes(slot.end)
    return requestedStart < slotEnd && requestedEnd > slotStart
  })
}

export function CalculateEndTime(startTime: string, durationMinutes: number): string {
  const startTotalMinutes = ConvertTimeToMinutes(startTime)
  const endTotalMinutes =
    (((startTotalMinutes + Math.max(durationMinutes, 1)) % 1440) + 1440) % 1440

  const endHours = String(Math.floor(endTotalMinutes / 60)).padStart(2, '0')
  const endMinutes = String(endTotalMinutes % 60).padStart(2, '0')
  return `${endHours}:${endMinutes}`
}

export function IsRoomAvailableOnDate(
  room: Room | null,
  isoDate: string,
  startTime: string,
  durationMinutes: number,
): boolean {
  if (!room || !isoDate) return false
  const daySlots = (room.schedules_list ?? []).filter((slot) => slot.date === isoDate)
  return GetConflictingSlots(daySlots, startTime, durationMinutes).length === 0
}

export function EvaluateRoomSharingStatus(
  room: Room,
  isoDate: string,
  startTime: string,
  durationMinutes: number,
): RoomSharingEvaluation {
  const sourceSlots =
    isoDate && room.schedules_list
      ? room.schedules_list.filter((slot) => slot.date === isoDate)
      : room.busy_slots ?? []

  if (!isoDate || sourceSlots.length === 0) {
    return {
      hasTimeConflict: false,
      conflictingSlots: [],
      isMarkedAsSharedByOtherTeacher: false,
      requiresConsentModal: false,
    }
  }

  const conflictingSlots = GetConflictingSlots(sourceSlots, startTime, durationMinutes)
  if (conflictingSlots.length === 0) {
    return {
      hasTimeConflict: false,
      conflictingSlots: [],
      isMarkedAsSharedByOtherTeacher: false,
      requiresConsentModal: false,
    }
  }

  const allConflictsAllowSharing = conflictingSlots.every((slot) => slot.is_shared === true)

  return {
    hasTimeConflict: true,
    conflictingSlots,
    isMarkedAsSharedByOtherTeacher: allConflictsAllowSharing,
    requiresConsentModal: !allConflictsAllowSharing,
  }
}

export function CalculateTargetRoomCapacity(
  eligibleOrEnrolledCount: number,
  safetyMargin = EXAM_SAFETY_MARGIN_STUDENTS,
): number {
  return eligibleOrEnrolledCount > 0 ? eligibleOrEnrolledCount + safetyMargin : 0
}

export function SortRoomsByBestFitCapacity(
  rooms: Room[],
  targetCapacity: number,
): Room[] {
  if (targetCapacity <= 0) return [...rooms]

  return [...rooms].sort((roomA, roomB) => {
    const capA = Number(roomA.capacity) || 0
    const capB = Number(roomB.capacity) || 0
    const aCoversTarget = capA >= targetCapacity
    const bCoversTarget = capB >= targetCapacity

    if (aCoversTarget !== bCoversTarget) return aCoversTarget ? -1 : 1
    return aCoversTarget ? capA - capB : capB - capA
  })
}

export function FormatShortDateSpanish(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return ''
  const [yearStr, monthStr, dayStr] = isoDate.split('-')
  const monthName = GetSpanishMonthName(Number(monthStr) - 1).slice(0, 3)
  return `${Number(dayStr)} ${monthName} ${yearStr}`
}

export function BuildDefaultExamName(
  evaluationType: EvaluationType,
  partialNumber: string,
): string {
  if (evaluationType === 'final') return 'Examen Final'
  if (evaluationType === 'makeup') return 'Examen de Instancia'

  const numericVal = Math.min(
    MAX_ALLOWED_PARTIAL_NUMBER,
    Math.max(1, Number(partialNumber) || 1),
  )
  return `${numericVal}º Parcial`
}

export function ParseExistingExamToSchedulerState(exam: {
  name: string
  evaluation_type?: EvaluationType | null
  duration_minutes: number
  start_time: string
  exam_date: string
  room?: { id: number } | null
  room_id?: number | string
}): InitialSchedulerState {
  const totalMinutes = Math.max(5, Number(exam.duration_minutes) || 90)
  const partialMatch = exam.name.match(/([1-6])/)
  const resolvedRoomId = exam.room?.id ?? exam.room_id ?? ''

  return {
    partialNumber: partialMatch ? partialMatch[1] : '1',
    evaluationType: exam.evaluation_type ?? 'partial',
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    startTime: exam.start_time ? exam.start_time.slice(0, 5) : '09:45',
    examDate: exam.exam_date ? exam.exam_date.slice(0, 10) : '',
    selectedRoomId: resolvedRoomId ? String(resolvedRoomId) : '',
  }
}