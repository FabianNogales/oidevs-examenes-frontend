import type { EvaluationType, Room, RoomBusySlot } from '../types/exam.types'

export const MAX_ALLOWED_PARTIAL_NUMBER = 6

// Periodos institucionales fijos de reserva de aula (90 min cada uno).
export const ROOM_RESERVATION_BLOCKS = [
  { start: '06:45', end: '08:15' },
  { start: '08:15', end: '09:45' },
  { start: '09:45', end: '11:15' },
  { start: '11:15', end: '12:45' },
  { start: '12:45', end: '14:15' },
  { start: '14:15', end: '15:45' },
  { start: '15:45', end: '17:15' },
  { start: '17:15', end: '18:45' },
  { start: '18:45', end: '20:15' },
  { start: '20:15', end: '21:45' },
] as const

export const RESERVATION_BLOCK_MINUTES = 90
export const MAX_RESERVATION_BLOCKS = 3
export const MIN_EXAM_DURATION_MINUTES = 5
export const MAX_EXAM_DURATION_MINUTES =
  RESERVATION_BLOCK_MINUTES * MAX_RESERVATION_BLOCKS
export const DEFAULT_EXAM_START_TIME = '09:45'
export const ROOM_SEARCH_MAX_LENGTH = 25

export interface ReservationWindow {
  startIndex: number
  blockCount: number
  coveredIndexes: number[]
  startTime: string
  endTime: string
  reservedMinutes: number
  isValid: boolean
}

export interface AcademicTermRange {
  name: string
  startDate: string
  endDate: string
}

export interface CalendarDayCell {
  key: string
  dayNumber: number
  isoDate: string
  isOutsideMonth: boolean
  isPastDate: boolean
  isOutsideTerm: boolean
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
  termRange: AcademicTermRange | null = null,
): CalendarDayCell {
  const isOutsideMonth = isoDate === ''
  return {
    key,
    dayNumber,
    isoDate,
    isOutsideMonth,
    isPastDate: isOutsideMonth || isoDate < todayIso,
    isOutsideTerm:
      !isOutsideMonth && !IsDateWithinAcademicTerm(isoDate, termRange),
    isToday: !isOutsideMonth && isoDate === todayIso,
  }
}

// Sin periodo conocido no se restringe en cliente; el backend sigue validando.
export function IsDateWithinAcademicTerm(
  isoDate: string,
  termRange: AcademicTermRange | null,
): boolean {
  if (!termRange) return true
  return isoDate >= termRange.startDate && isoDate <= termRange.endDate
}

export function BuildCalendarMonthCells(
  year: number,
  monthIndex: number,
  todayIso: string,
  termRange: AcademicTermRange | null = null,
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
    cells.push(CreateCalendarCell(isoDate, dayNum, isoDate, todayIso, termRange))
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

// Número de periodos de 90 min que ocupa un examen (mínimo 1, máximo 3).
export function CalculateRequiredBlocks(durationMinutes: number): number {
  const blocks = Math.ceil(Math.max(durationMinutes, 1) / RESERVATION_BLOCK_MINUTES)
  return Math.min(MAX_RESERVATION_BLOCKS, Math.max(1, blocks))
}

export function FindReservationBlockIndex(startTime: string): number {
  return ROOM_RESERVATION_BLOCKS.findIndex((block) => block.start === startTime)
}

// Último periodo desde el cual el examen aún termina dentro de la jornada (21:45).
export function GetLatestStartBlockIndex(blockCount: number): number {
  return ROOM_RESERVATION_BLOCKS.length - Math.max(1, blockCount)
}

// Ajusta una hora libre (ej. registros antiguos) al periodo que la contiene.
export function SnapToReservationBlock(timeText: string): string {
  const targetMinutes = ConvertTimeToMinutes(timeText.slice(0, 5))
  let selected: string = ROOM_RESERVATION_BLOCKS[0].start
  for (const block of ROOM_RESERVATION_BLOCKS) {
    if (ConvertTimeToMinutes(block.start) <= targetMinutes) selected = block.start
  }
  return selected
}

export function ClampExamDuration(totalMinutes: number): number {
  return Math.min(
    MAX_EXAM_DURATION_MINUTES,
    Math.max(MIN_EXAM_DURATION_MINUTES, Math.round(totalMinutes) || 0),
  )
}

export function ResolveReservationWindow(
  startTime: string,
  durationMinutes: number,
): ReservationWindow {
  const blockCount = CalculateRequiredBlocks(durationMinutes)
  const startIndex = FindReservationBlockIndex(startTime)
  const lastIndex = startIndex + blockCount - 1
  const isValid =
    startIndex >= 0 &&
    lastIndex < ROOM_RESERVATION_BLOCKS.length &&
    durationMinutes >= MIN_EXAM_DURATION_MINUTES &&
    durationMinutes <= MAX_EXAM_DURATION_MINUTES

  const coveredIndexes =
    startIndex >= 0
      ? Array.from({ length: blockCount }, (_, offset) => startIndex + offset).filter(
          (index) => index < ROOM_RESERVATION_BLOCKS.length,
        )
      : []

  return {
    startIndex,
    blockCount,
    coveredIndexes,
    startTime,
    endTime: isValid
      ? ROOM_RESERVATION_BLOCKS[lastIndex].end
      : CalculateEndTime(startTime, blockCount * RESERVATION_BLOCK_MINUTES),
    reservedMinutes: blockCount * RESERVATION_BLOCK_MINUTES,
    isValid,
  }
}

export function GetRoomConflictingSlots(
  room: Room,
  isoDate: string,
  startTime: string,
  reservedMinutes: number,
): RoomBusySlot[] {
  if (!isoDate) return []
  const sourceSlots = room.schedules_list
    ? room.schedules_list.filter((slot) => slot.date === isoDate)
    : (room.busy_slots ?? [])
  return GetConflictingSlots(sourceSlots, startTime, reservedMinutes)
}

// Búsqueda de aulas: solo letras minúsculas y números, máximo 25 caracteres.
export function SanitizeRoomSearchQuery(rawValue: string): string {
  return rawValue
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, ROOM_SEARCH_MAX_LENGTH)
}

export function RoomMatchesSearch(room: Room, sanitizedQuery: string): boolean {
  if (!sanitizedQuery) return true
  const haystack = SanitizeRoomSearchText(
    [room.name, room.code, room.location, room.floor].filter(Boolean).join(' '),
  )
  return haystack.includes(sanitizedQuery)
}

function SanitizeRoomSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function FormatDurationLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

export function FormatBlockCountLabel(blockCount: number): string {
  return blockCount === 1 ? '1 periodo' : `${blockCount} periodos`
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
  if (evaluationType === 'recovery') return 'Examen Recuperatorio'

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
  const totalMinutes = ClampExamDuration(Number(exam.duration_minutes) || 90)
  const partialMatch = exam.name.match(/([1-6])/)
  const resolvedRoomId = exam.room?.id ?? exam.room_id ?? ''
  const blockCount = CalculateRequiredBlocks(totalMinutes)
  const snappedStart = exam.start_time
    ? SnapToReservationBlock(exam.start_time)
    : DEFAULT_EXAM_START_TIME
  const latestStart = ROOM_RESERVATION_BLOCKS[GetLatestStartBlockIndex(blockCount)].start
  const startTime =
    FindReservationBlockIndex(snappedStart) > GetLatestStartBlockIndex(blockCount)
      ? latestStart
      : snappedStart

  return {
    partialNumber: partialMatch ? partialMatch[1] : '1',
    evaluationType: exam.evaluation_type ?? 'partial',
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    startTime,
    examDate: exam.exam_date ? exam.exam_date.slice(0, 10) : '',
    selectedRoomId: resolvedRoomId ? String(resolvedRoomId) : '',
  }
}