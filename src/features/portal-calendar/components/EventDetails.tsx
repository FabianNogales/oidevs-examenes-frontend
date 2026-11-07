import type { PortalEvent } from '../types/calendar.types'
import { eventDateLabel } from '../utils/calendarDates'
import styles from '../pages/portalCalendar.module.css'

export function EventDetails({ event }: { event: PortalEvent }) {
  return (
    <article className={styles.details}>
      <h3>{event.title}</h3>
      <p>{eventDateLabel(event)}</p>
      <dl>
        <dt>Categoría</dt>
        <dd>{event.category.name}</dd>
        {event.location ? (
          <>
            <dt>Ubicación</dt>
            <dd>{event.location}</dd>
          </>
        ) : null}
      </dl>
      <p className={styles.description}>{event.description}</p>
    </article>
  )
}
