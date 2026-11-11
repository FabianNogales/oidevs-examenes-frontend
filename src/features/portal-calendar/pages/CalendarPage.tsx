import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { InstitutionalCalendar } from '../components/InstitutionalCalendar'

export function CalendarPage() {
  return (
    <main>
      <PageContainer width="narrow">
        <PageHeader
          title="Calendario institucional"
          description="Consulta las actividades publicadas por la institución. Horarios de Bolivia."
          breadcrumbs={[
            { label: 'Inicio', to: '/' },
            { label: 'Calendario institucional' },
          ]}
        />
        <InstitutionalCalendar />
      </PageContainer>
    </main>
  )
}
