import { useCallback, useId, useState } from 'react'
import { Link } from 'react-router'
import { getEventCategories, getPublicEvents } from '../api/portalCalendarApi'
import { useCalendarResource } from '../hooks/useCalendarResource'
import {
  boliviaDate,
  eventDateLabel,
  eventsOnDay,
  monthDays,
  monthInterval,
  monthLabel,
  shiftMonth,
} from '../utils/calendarDates'
import { PublicEventDialog } from './PublicEventDialog'
import styles from '../portalCalendar.module.css'

export function InstitutionalCalendar({
  compact = false,
}: {
  compact?: boolean
}) {
  const id = useId()
  const [month, setMonth] = useState(() => boliviaDate().slice(0, 7))
  const [category, setCategory] = useState('')
  const [day, setDay] = useState<string | null>(null)
  const [eventId, setEventId] = useState<number | null>(null)
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
  function navigate(amount: number) {
    setDay(null)
    setMonth(shiftMonth(month, amount))
  }

  return (
    <section className={styles.calendar} aria-labelledby={`${id}-title`}>
      <header className={styles.toolbar}>
        <h2 id={`${id}-title`}>Calendario institucional</h2>
        {compact ? <Link to="/calendar">Ver todos</Link> : null}
      </header>
      <div className={styles.month}>
        <button
          type="button"
          aria-label="Año anterior"
          title="Año anterior"
          onClick={() => navigate(-12)}
        >
          «
        </button>
        <button
          type="button"
          aria-label="Mes anterior"
          title="Mes anterior"
          onClick={() => navigate(-1)}
        >
          ‹
        </button>
        <strong aria-live="polite">{monthLabel(month)}</strong>
        <button
          type="button"
          aria-label="Mes siguiente"
          title="Mes siguiente"
          onClick={() => navigate(1)}
        >
          ›
        </button>
        <button
          type="button"
          aria-label="Año siguiente"
          title="Año siguiente"
          onClick={() => navigate(12)}
        >
          »
        </button>
      </div>
      {categories.loading ? (
        <p role="status">Cargando categorías…</p>
      ) : categories.error ? (
        <div role="alert">
          <p>{categories.error.message}</p>
          <button type="button" onClick={categories.reload}>
            Reintentar categorías
          </button>
        </div>
      ) : categories.data?.length ? (
        <label className={styles.field}>
          Categoría
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              setDay(null)
            }}
          >
            <option value="">Todas las categorías</option>
            {categories.data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className={styles.muted}>
          No hay categorías de eventos disponibles.
        </p>
      )}
      <div
        className={styles.grid}
        aria-label={`Calendario de ${monthLabel(month)}`}
        aria-busy={result.loading}
      >
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label) => (
          <span key={label} className={styles.weekday}>
            {label}
          </span>
        ))}
        {monthDays(month).map((date) => {
          const count = eventsOnDay(events, date).length
          const outside = date.slice(0, 7) !== month
          const selected = day === date
          const current = date === boliviaDate()
          const activityLabel = `${count} ${count === 1 ? 'actividad' : 'actividades'}`
          return (
            <button
              key={date}
              type="button"
              disabled={outside || result.loading || !!result.error}
              className={`${styles.day} ${count ? styles.dayWithEvents : ''}`}
              aria-pressed={selected}
              aria-current={current ? 'date' : undefined}
              aria-label={`${date.split('-').reverse().join('/')}: ${activityLabel}`}
              onClick={() => setDay(selected ? null : date)}
            >
              <span className={styles.dayNumber}>{Number(date.slice(-2))}</span>
              <span className={styles.dot} aria-hidden="true">
                {count ? '•' : '\u00a0'}
              </span>
            </button>
          )
        })}
      </div>
      <p className={styles.calendarLegend}>
        <span className={styles.legendMarker} aria-hidden="true">
          •
        </span>{' '}
        Con actividades
      </p>
      {day ? (
        <div className={styles.toolbar}>
          <p>Eventos del {day.split('-').reverse().join('/')}</p>
          <button type="button" onClick={() => setDay(null)}>
            Ver todo el mes
          </button>
        </div>
      ) : null}
      {result.loading ? (
        <p role="status">Cargando eventos…</p>
      ) : result.error ? (
        <div className={styles.error} role="alert">
          <p>{result.error.message}</p>
          <button type="button" onClick={result.reload}>
            Reintentar eventos
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p role="status" className={styles.muted}>
          No hay eventos institucionales programados para este periodo.
        </p>
      ) : (
        <ul className={styles.agenda} aria-label="Eventos institucionales">
          {visible.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                className={styles.eventTitle}
                onClick={() => setEventId(event.id)}
              >
                {event.title}
              </button>
              <p>{eventDateLabel(event)}</p>
              <p>
                {event.category.name}
                {event.location ? ` · ${event.location}` : ''}
              </p>
              <p className={styles.agendaDescription}>{event.description}</p>
            </li>
          ))}
        </ul>
      )}
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
