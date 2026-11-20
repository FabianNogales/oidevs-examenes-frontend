import { useMemo, useState } from 'react'
import type { Room } from '../../types/exam.types'
import {
  BuildCalendarMonthCells,
  FormatShortDateSpanish,
  GetSpanishMonthName,
  IsRoomAvailableOnDate,
  type AcademicTermRange,
  type TimezoneDateInfo,
} from '../../utils/examScheduleFormatters'
import styles from './ExamCalendarCard.module.css'

export interface ExamCalendarCardProps {
  selectedDate: string
  selectedRoom: Room | null
  startTime: string
  reservedMinutes: number
  timezoneDate: TimezoneDateInfo
  academicTermRange: AcademicTermRange | null
  disabled: boolean
  onSelectDate: (isoDate: string) => void
  onClearDate: () => void
}

const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

function FormatIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function ExamCalendarCard({
  selectedDate,
  selectedRoom,
  startTime,
  reservedMinutes,
  timezoneDate,
  academicTermRange,
  disabled,
  onSelectDate,
  onClearDate,
}: ExamCalendarCardProps) {
  const initialYearMonth = useMemo(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [yearPart, monthPart] = selectedDate.split('-').map(Number)
      return { year: yearPart, monthIndex: monthPart - 1 }
    }
    return { year: timezoneDate.year, monthIndex: timezoneDate.monthIndex }
  }, [selectedDate, timezoneDate.year, timezoneDate.monthIndex])

  const [viewYear, setViewYear] = useState<number>(initialYearMonth.year)
  const [viewMonthIndex, setViewMonthIndex] = useState<number>(
    initialYearMonth.monthIndex,
  )

  const monthCells = useMemo(
    () =>
      BuildCalendarMonthCells(
        viewYear,
        viewMonthIndex,
        timezoneDate.todayIso,
        academicTermRange,
      ),
    [viewYear, viewMonthIndex, timezoneDate.todayIso, academicTermRange],
  )

  const canGoNextMonth = useMemo(() => {
    if (!academicTermRange) return true
    const nextMonthStart = new Date(viewYear, viewMonthIndex + 1, 1)
    const nextMonthIso = FormatIsoDate(
      nextMonthStart.getFullYear(),
      nextMonthStart.getMonth(),
      1,
    )
    return nextMonthIso <= academicTermRange.endDate
  }, [academicTermRange, viewYear, viewMonthIndex])

  const canGoPrevMonth = useMemo(() => {
    if (!academicTermRange) return true
    const prevMonthEnd = new Date(viewYear, viewMonthIndex, 0)
    const prevMonthLastIso = FormatIsoDate(
      prevMonthEnd.getFullYear(),
      prevMonthEnd.getMonth(),
      prevMonthEnd.getDate(),
    )
    return prevMonthLastIso >= academicTermRange.startDate
  }, [academicTermRange, viewYear, viewMonthIndex])

  const HandleNavigateMonth = (monthOffset: number) => {
    if (monthOffset > 0 && !canGoNextMonth) return
    if (monthOffset < 0 && !canGoPrevMonth) return
    const nextDate = new Date(viewYear, viewMonthIndex + monthOffset, 1)
    setViewYear(nextDate.getFullYear())
    setViewMonthIndex(nextDate.getMonth())
  }

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeaderRow}>
        <div className={styles.calendarNavGroup}>
          <button
            type="button"
            disabled={disabled || !canGoPrevMonth}
            className={styles.monthArrowBtn}
            onClick={() => HandleNavigateMonth(-1)}
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <span className={styles.calendarMonthTitle}>
            {GetSpanishMonthName(viewMonthIndex)} {viewYear}
          </span>
          <button
            type="button"
            disabled={disabled || !canGoNextMonth}
            className={styles.monthArrowBtn}
            onClick={() => HandleNavigateMonth(1)}
            aria-label="Mes siguiente"
          >
            ›
          </button>
        </div>

        <button
          type="button"
          className={styles.clearSelectionBtn}
          disabled={!selectedDate || disabled}
          onClick={onClearDate}
        >
          ✕ Quitar día
        </button>
      </div>

      <div className={styles.weekdaysHeader}>
        {WEEKDAY_INITIALS.map((dayInitial) => (
          <span key={dayInitial}>{dayInitial}</span>
        ))}
      </div>

      <div className={styles.calendarCellsGrid}>
        {monthCells.map((cell) => {
          if (cell.isOutsideMonth) {
            return (
              <div
                key={cell.key}
                className={`${styles.calendarDayBtn} ${styles.calendarDayOutside}`}
              >
                {cell.dayNumber}
              </div>
            )
          }

          const isSelected = selectedDate === cell.isoDate
          const isUnavailableDate = cell.isPastDate || cell.isOutsideTerm

          // Si el usuario seleccionó un aula, marcamos en verde los días libres de esa aula
          let roomDayAvailabilityClass = ''
          if (!isUnavailableDate && selectedRoom && !isSelected) {
            const isRoomFreeThatDay = IsRoomAvailableOnDate(
              selectedRoom,
              cell.isoDate,
              startTime,
              reservedMinutes,
            )
            roomDayAvailabilityClass = isRoomFreeThatDay
              ? styles.calendarDayRoomFree
              : styles.calendarDayRoomBusy
          }

          const dayButtonClasses = [
            styles.calendarDayBtn,
            cell.isPastDate ? styles.calendarDayPast : '',
            !cell.isPastDate && cell.isOutsideTerm
              ? styles.calendarDayOutsideTerm
              : '',
            roomDayAvailabilityClass,
            cell.isToday && !isSelected ? styles.calendarDayToday : '',
            isSelected ? styles.calendarDaySelected : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={cell.key}
              type="button"
              disabled={isUnavailableDate || disabled}
              className={dayButtonClasses}
              onClick={() => onSelectDate(cell.isoDate)}
              aria-pressed={isSelected}
              title={
                cell.isOutsideTerm
                  ? 'Fuera del periodo académico vigente'
                  : undefined
              }
            >
              <span>{cell.dayNumber}</span>
            </button>
          )
        })}
      </div>

      <div className={styles.calendarFooterMeta}>
        <div className={styles.legendItemsGroup}>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: 'var(--color-accent)' }}
            />
            <span>Día elegido</span>
          </span>
          {selectedRoom ? (
            <span className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{
                  background: 'var(--color-success-soft)',
                  border: '1.5px solid var(--color-success)',
                }}
              />
              <span>Aula libre este día</span>
            </span>
          ) : null}
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-primary)',
              }}
            />
            <span>Hoy</span>
          </span>
        </div>
        <div className={styles.calendarMetaRight}>
          {academicTermRange ? (
            <span className={styles.termLimitTag}>
              Periodo {academicTermRange.name}: hasta{' '}
              {FormatShortDateSpanish(academicTermRange.endDate)}
            </span>
          ) : null}
          <span>Zona: {timezoneDate.timeZoneName}</span>
        </div>
      </div>
    </div>
  )
}
