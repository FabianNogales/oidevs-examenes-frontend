import { useMemo, useState } from 'react'
import type { Room } from '../../types/exam.types'
import {
  BuildCalendarMonthCells,
  GetSpanishMonthName,
  IsRoomAvailableOnDate,
  type TimezoneDateInfo,
} from '../../utils/examScheduleFormatters'
import styles from './ExamCalendarCard.module.css'

export interface ExamCalendarCardProps {
  selectedDate: string
  selectedRoom: Room | null
  startTime: string
  durationMinutes: number
  timezoneDate: TimezoneDateInfo
  disabled: boolean
  onSelectDate: (isoDate: string) => void
  onClearDate: () => void
}

const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

export function ExamCalendarCard({
  selectedDate,
  selectedRoom,
  startTime,
  durationMinutes,
  timezoneDate,
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
      BuildCalendarMonthCells(viewYear, viewMonthIndex, timezoneDate.todayIso),
    [viewYear, viewMonthIndex, timezoneDate.todayIso],
  )

  const HandleNavigateMonth = (monthOffset: number) => {
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
            disabled={disabled}
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
            disabled={disabled}
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

          // Si el usuario seleccionó un aula, marcamos en verde los días libres de esa aula
          let roomDayAvailabilityClass = ''
          if (!cell.isPastDate && selectedRoom && !isSelected) {
            const isRoomFreeThatDay = IsRoomAvailableOnDate(
              selectedRoom,
              cell.isoDate,
              startTime,
              durationMinutes,
            )
            roomDayAvailabilityClass = isRoomFreeThatDay
              ? styles.calendarDayRoomFree
              : styles.calendarDayRoomBusy
          }

          const dayButtonClasses = [
            styles.calendarDayBtn,
            cell.isPastDate ? styles.calendarDayPast : '',
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
              disabled={cell.isPastDate || disabled}
              className={dayButtonClasses}
              onClick={() => onSelectDate(cell.isoDate)}
              aria-pressed={isSelected}
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
        <span>Zona: {timezoneDate.timeZoneName}</span>
      </div>
    </div>
  )
}