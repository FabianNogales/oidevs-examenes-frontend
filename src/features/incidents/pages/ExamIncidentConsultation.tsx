import { Link, useSearchParams } from 'react-router'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { ExamIncidentNavigation } from '../components/ExamIncidentNavigation'
import { IncidentConsultationFilters } from '../components/IncidentConsultationFilters'
import { IncidentConsultationSummary } from '../components/IncidentConsultationSummary'
import { IncidentRecordsTable } from '../components/IncidentRecordsTable'
import { useIncidentConsultation } from '../hooks/useIncidentConsultation'
import { incidentConsultationSearch } from '../utils/incidentConsultationNavigation'
import styles from './Incidents.module.css'

export function ExamIncidentConsultation({ examId }: { examId: number }) {
  const list = useIncidentConsultation(examId)
  const [params] = useSearchParams()
  const search = incidentConsultationSearch(params)
  const filters = {
    search: list.query.search,
    type: list.query.type,
    status: list.query.status,
    date_from: list.query.date_from,
    date_to: list.query.date_to,
  }
  const response = list.response
  const filtered = Object.values(filters).some((value) => value.trim())
  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Mis exámenes', to: '/teacher/exams' },
            { label: 'Incidencias' },
          ]}
        />
        <header className={styles.heading}>
          <h1>Incidencias e ingresos irregulares</h1>
          <p>
            {response
              ? `${response.exam.name} · ${response.exam.subject_name}`
              : 'Consulta los acontecimientos registrados para este examen.'}
          </p>
        </header>
        <ExamIncidentNavigation examId={examId} />
        <div className={styles.access}>
          {response?.permissions.can_create && (
            <Link to={`/exams/${examId}/incidents/create${search}`}>
              Registrar incidencia
            </Link>
          )}
          <Link to={`/exams/${examId}/entry-control?from=teacher`}>
            Control de ingreso
          </Link>
        </div>
        <IncidentConsultationFilters
          key={JSON.stringify(filters)}
          initial={filters}
          statuses={response?.filters.statuses ?? []}
          onApply={list.apply}
        />
        {response && <IncidentConsultationSummary summary={response.summary} />}
        <IncidentRecordsTable
          data={response?.data ?? []}
          meta={response?.meta}
          loading={list.loading}
          error={list.error}
          retry={list.retry}
          setPage={list.setPage}
          statuses={response?.filters.statuses}
          filtered={filtered}
          detailPath={(item) =>
            `/exams/${examId}/incidents/${item.id}${search}`
          }
        />
        <p className={styles.note}>
          Una incidencia documenta lo ocurrido; no confirma una infracción ni
          aplica una sanción. Los contadores proceden del servidor. Horarios de
          Bolivia (UTC−4).
        </p>
      </section>
    </main>
  )
}
