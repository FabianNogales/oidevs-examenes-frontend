import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Link } from 'react-router'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { getEventCategories, getPublicEvents } from '../api/portalCalendarApi'
import { useCalendarResource } from '../hooks/useCalendarResource'
import {
  CALENDAR_ZONE,
  boliviaDate,
  eventDateLabel,
  eventsOnDay,
  monthDays,
  monthInterval,
  monthLabel,
  shiftDay,
  shiftMonth,
} from '../utils/calendarDates'
import type { PortalEvent } from '../types/calendar.types'
import { PublicEventDialog } from './PublicEventDialog'
import { Dropdown } from '@/shared/components/ui/Dropdown/Dropdown'
import { Badge } from '@/shared/components/ui/Badge/Badge'
import { Icon } from '@/shared/components/ui/Icon/Icon'
import styles from './InstitutionalCalendar.module.css'

/** Inicio (compact): máximo de actividades visibles; la rejilla y /calendar siguen mostrando todas. */
const COMPACT_LIMIT = 3
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
/** Same noon anchor as calendarDates: the weekday of a Bolivian calendar date. */
const weekdayIndex = (date: string) =>
  (new Date(`${date}T12:00:00-04:00`).getUTCDay() + 6) % 7
const displayDate = (date: string) => date.split('-').reverse().join('/')
const timeFormat = new Intl.DateTimeFormat('es-BO', {
  timeZone: CALENDAR_ZONE,
  timeStyle: 'short',
})
const headingFormat = new Intl.DateTimeFormat('es-BO', {
  timeZone: CALENDAR_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const dayHeading = (date: string) => {
  const text = headingFormat.format(new Date(`${date}T12:00:00-04:00`))
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1)
}
/** True when the event covers more than one Bolivian calendar day (end is exclusive, as in eventsOnDay). */
const spansDays = (event: PortalEvent) =>
  boliviaDate(new Date(event.starts_at)) !==
  boliviaDate(new Date(Date.parse(event.ends_at) - 1))

/**
 * Agenda groups: each event is listed once, under the first visible day on which
 * eventsOnDay places it. A selected day keeps the existing day filter.
 */
function groupByDay(events: PortalEvent[], dates: string[]) {
  const groups = new Map<string, PortalEvent[]>()
  for (const event of events) {
    const date =
      dates.find((item) => eventsOnDay([event], item).length > 0) ??
      boliviaDate(new Date(event.starts_at))
    groups.set(date, [...(groups.get(date) ?? []), event])
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export function InstitutionalCalendar({
  compact = false,
}: {
  compact?: boolean
}) {
  const id = useId()
  const today = boliviaDate()
  const [month, setMonth] = useState(() => today.slice(0, 7))
  const [category, setCategory] = useState('')
  const [day, setDay] = useState<string | null>(null)
  const [eventId, setEventId] = useState<number | null>(null)
  const [focusDate, setFocusDate] = useState<string | null>(null)
  // Instante de referencia de «próximas» (Inicio), fijado al montar para que el render sea puro.
  const [now] = useState(() => Date.now())
  const grid = useRef<HTMLDivElement>(null)
  const moveFocus = useRef(false)
  const loadCategories = useCallback(
    (signal: AbortSignal) => getEventCategories(false, signal),
    [],
  )
  const categories = useCalendarResource(loadCategories)
  const loadEvents = useCallback(
    (signal: AbortSignal) =>
      getPublicEvents(
        {
          ...monthInterval(month),
          ...(category ? { category_id: Number(category) } : {}),
        },
        signal,
      ),
    [month, category],
  )
  const result = useCalendarResource(loadEvents)
  const events = result.data ?? []
  const visible = day ? eventsOnDay(events, day) : events
  const days = monthDays(month)
  const inMonth = (date: string) => date.slice(0, 7) === month
  const monthDates = days.filter(inMonth)
  const unavailable = result.loading || !!result.error
  // Roving tabindex: a single Tab stop inside the grid.
  const tabDate =
    [focusDate, day, today].find(
      (date): date is string => !!date && inMonth(date),
    ) ?? `${month}-01`

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${tabDate}"]`)
      ?.focus()
  }, [tabDate])

  function navigate(amount: number) {
    setDay(null)
    setFocusDate(null)
    setMonth(shiftMonth(month, amount))
  }

  function goToday() {
    setDay(null)
    setFocusDate(today)
    setMonth(today.slice(0, 7))
  }

  function focusOn(date: string) {
    moveFocus.current = true
    setFocusDate(date)
    if (date.slice(0, 7) !== month) {
      // Changing month by keyboard behaves like the month buttons: no selected day.
      setDay(null)
      setMonth(date.slice(0, 7))
    }
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const { from, to } = monthInterval(month)
    const clamp = (value: string) =>
      value < from ? from : value > to ? to : value
    const sameDayIn = (target: string) => {
      const { to: last } = monthInterval(target)
      const candidate = `${target}-${date.slice(-2)}`
      return candidate > last ? last : candidate
    }
    const targets: Record<string, () => string> = {
      ArrowLeft: () => shiftDay(date, -1),
      ArrowRight: () => shiftDay(date, 1),
      ArrowUp: () => shiftDay(date, -7),
      ArrowDown: () => shiftDay(date, 7),
      Home: () => clamp(shiftDay(date, -weekdayIndex(date))),
      End: () => clamp(shiftDay(date, 6 - weekdayIndex(date))),
      PageUp: () => sameDayIn(shiftMonth(month, -1)),
      PageDown: () => sameDayIn(shiftMonth(month, 1)),
    }
    const target = targets[event.key]
    if (!target) return
    event.preventDefault()
    focusOn(target())
  }

  const groupDates = day ? [day] : monthDates
  // Inicio: en el mes actual y sin día elegido se priorizan las actividades que aún no terminaron
  // (hora de Bolivia vía instantes ISO); si no queda ninguna se muestran las primeras del mes.
  const upcoming =
    compact && !day && month === today.slice(0, 7)
      ? visible.filter((event) => Date.parse(event.ends_at) > now)
      : []
  const ordered = groupByDay(upcoming.length ? upcoming : visible, groupDates)
    .flatMap(([, items]) => items)
  const shown = compact ? ordered.slice(0, COMPACT_LIMIT) : ordered
  const hidden = visible.length - shown.length
  const agendaTitle = day
    ? `Eventos del ${displayDate(day)}`
    : upcoming.length
      ? 'Próximas actividades'
      : `Actividades de ${monthLabel(month)}`
  const groups = groupByDay(shown, groupDates)

  const agenda = result.loading ? (
    <p role="status" className={styles.state}>
      Cargando eventos…
    </p>
  ) : result.error ? (
    <div className={styles.error} role="alert">
      <p>{result.error.message}</p>
      <button type="button" className={styles.textButton} onClick={result.reload}>
        Reintentar eventos
      </button>
    </div>
  ) : visible.length === 0 ? (
    <p role="status" className={styles.state}>
      No hay eventos institucionales programados para este periodo.
    </p>
  ) : (
    <ul className={styles.agenda} aria-label="Eventos institucionales">
      {groups.map(([date, items]) => (
        <li key={date} className={styles.agendaDay}>
          <h4 className={styles.agendaDate}>
            <time dateTime={date}>{dayHeading(date)}</time>
          </h4>
          <ul className={styles.agendaEvents}>
            {items.map((event) => (
              <li key={event.id} className={styles.agendaItem}>
                <p className={styles.time}>
                  {event.all_day ? (
                    'Día completo'
                  ) : (
                    <>
                      <span>{timeFormat.format(new Date(event.starts_at))}</span>
                      <span>{timeFormat.format(new Date(event.ends_at))}</span>
                    </>
                  )}
                </p>
                <div className={styles.eventBody}>
                  <button
                    type="button"
                    className={styles.eventTitle}
                    onClick={() => setEventId(event.id)}
                  >
                    {event.title}
                  </button>
                  {spansDays(event) ? (
                    <p className={styles.range}>{eventDateLabel(event)}</p>
                  ) : null}
                  <p className={styles.meta}>
                    <Badge tone="neutral" size="sm" className={styles.category}>
                      {event.category.name}
                    </Badge>
                    {event.location ? (
                      <span className={styles.location}>{event.location}</span>
                    ) : null}
                  </p>
                  <p className={styles.description}>{event.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
  const more =
    compact && hidden > 0 && !result.loading && !result.error ? (
      <p className={styles.more}>
        Mostrando {shown.length} de {visible.length} actividades.{' '}
        <Link to="/calendar">Ver todas en el calendario</Link>
      </p>
    ) : null

  return (
    <section
      className={`${styles.calendar} ${compact ? styles.compact : styles.full}`}
      aria-labelledby={`${id}-title`}
    >
      <header className={styles.header}>
        <h2
          id={`${id}-title`}
          className={compact ? styles.title : styles.visuallyHidden}
        >
          Calendario institucional
        </h2>
        {compact ? (
          <Link to="/calendar" className={styles.seeAll}>
            Ver todos
          </Link>
        ) : null}
      </header>

      <div className={styles.layout}>
        <div className={styles.monthPanel}>
          <div className={styles.monthBar}>
            <strong className={styles.monthLabel} aria-live="polite">
              {monthLabel(month)}
            </strong>
            <div className={styles.navigation}>
              <button
                type="button"
                className={`${styles.iconButton} ${styles.yearButton}`}
                aria-label="Año anterior"
                title="Año anterior"
                onClick={() => navigate(-12)}
              >
                <Icon icon={ChevronsLeft} size="md" />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Mes anterior"
                title="Mes anterior"
                onClick={() => navigate(-1)}
              >
                <Icon icon={ChevronLeft} size="md" />
              </button>
              <button
                type="button"
                className={styles.todayButton}
                onClick={goToday}
              >
                Hoy
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Mes siguiente"
                title="Mes siguiente"
                onClick={() => navigate(1)}
              >
                <Icon icon={ChevronRight} size="md" />
              </button>
              <button
                type="button"
                className={`${styles.iconButton} ${styles.yearButton}`}
                aria-label="Año siguiente"
                title="Año siguiente"
                onClick={() => navigate(12)}
              >
                <Icon icon={ChevronsRight} size="md" />
              </button>
            </div>
          </div>

          {categories.loading ? (
            <p role="status" className={styles.muted}>
              Cargando categorías…
            </p>
          ) : categories.error ? (
            <div role="alert" className={styles.error}>
              <p>{categories.error.message}</p>
              <button
                type="button"
                className={styles.textButton}
                onClick={categories.reload}
              >
                Reintentar categorías
              </button>
            </div>
          ) : categories.data?.length ? (
            <label className={styles.filter}>
              <span className={styles.filterLabel}>Categoría</span>
              <Dropdown<string | number>
                value={category}
                options={[
                  { value: '', label: 'Todas las categorías' },
                  ...categories.data.map((item) => ({
                    value: item.id,
                    label: item.name,
                  })),
                ]}
                onChange={(nextValue) => {
                  setCategory(String(nextValue))
                  setDay(null)
                }}
              />
            </label>
          ) : (
            <p className={styles.muted}>
              No hay categorías de eventos disponibles.
            </p>
          )}

          <p id={`${id}-keys`} className={styles.visuallyHidden}>
            Usa las flechas para cambiar de fecha, Inicio y Fin para ir al comienzo
            o al final de la semana, y Retroceder página o Avanzar página para
            cambiar de mes.
          </p>
          <div
            ref={grid}
            role="group"
            className={styles.grid}
            aria-label={`Calendario de ${monthLabel(month)}`}
            aria-describedby={`${id}-keys`}
            aria-busy={result.loading}
          >
            {WEEKDAYS.map((label) => (
              <span key={label} className={styles.weekday}>
                {label}
              </span>
            ))}
            {days.map((date) => {
              const count = eventsOnDay(events, date).length
              const outside = !inMonth(date)
              const selected = day === date
              const current = date === today
              const activityLabel = `${count} ${count === 1 ? 'actividad' : 'actividades'}`
              return (
                <button
                  key={date}
                  type="button"
                  data-date={date}
                  disabled={outside}
                  aria-disabled={!outside && unavailable ? true : undefined}
                  tabIndex={!outside && date === tabDate ? 0 : -1}
                  className={[
                    styles.day,
                    outside ? styles.outside : '',
                    current ? styles.today : '',
                    selected ? styles.selected : '',
                  ].join(' ')}
                  aria-pressed={selected}
                  aria-current={current ? 'date' : undefined}
                  aria-label={`${displayDate(date)}: ${activityLabel}`}
                  onKeyDown={(event) => handleKey(event, date)}
                  onClick={() => {
                    if (unavailable) return
                    setFocusDate(date)
                    setDay(selected ? null : date)
                  }}
                >
                  <span className={styles.dayNumber}>
                    {Number(date.slice(-2))}
                  </span>
                  <span className={styles.dots} aria-hidden="true">
                    {Array.from({ length: Math.min(count, 3) }, (_, index) => (
                      <span key={index} className={styles.dot} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
          <p className={styles.legend}>
            <span className={styles.legendDot} aria-hidden="true" />
            Con actividades
          </p>
        </div>

        <div className={styles.agendaPanel}>
          <div className={styles.agendaHeader}>
            <h3 className={styles.agendaTitle}>{agendaTitle}</h3>
            {day ? (
              <button
                type="button"
                className={styles.textButton}
                onClick={() => setDay(null)}
              >
                Ver todo el mes
              </button>
            ) : null}
          </div>
          {agenda}
          {more}
        </div>
      </div>

      {eventId !== null ? (
        <PublicEventDialog
          key={eventId}
          eventId={eventId}
          onClose={() => setEventId(null)}
        />
      ) : null}
    </section>
  )
}
