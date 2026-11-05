import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { InstitutionalCalendar } from '../components/InstitutionalCalendar'
import styles from '../portalCalendar.module.css'

export function CalendarPage() {
  return (
    <main className={styles.publicPage}>
      <Breadcrumbs
        items={[
          { label: 'Inicio', to: '/' },
          { label: 'Calendario institucional' },
        ]}
      />
      <h1>Calendario institucional</h1>
      <p>
        Consulta las actividades publicadas por la institución. Horarios de
        Bolivia.
      </p>
      <InstitutionalCalendar />
    </main>
  )
}
