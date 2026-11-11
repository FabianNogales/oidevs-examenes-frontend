import { Link, useSearchParams } from 'react-router'
import { Fragment, type ReactNode } from 'react'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { ExamIncidentNavigation } from '../components/ExamIncidentNavigation'
import { IncidentConsultationFilters } from '../components/IncidentConsultationFilters'
import { IncidentConsultationSummary } from '../components/IncidentConsultationSummary'
import { IncidentRecordsTable } from '../components/IncidentRecordsTable'
import { useIncidentConsultation } from '../hooks/useIncidentConsultation'
import { incidentConsultationSearch } from '../utils/incidentConsultationNavigation'
import styles from './Incidents.module.css'
import { IncidentExportActions } from '../components/IncidentExportActions'
import type { IncidentsPage } from '../types/incident.types'

// U3.4b: header and container come from PageHeader/PageContainer (Incidents.module.css unchanged).
const titleId = 'incident-consultation-title'

export function ExamIncidentConsultation({
  examId,
  mode = 'teacher',
  renderExamPicker,
  embedded = false,
}: {
  examId: number
  mode?: 'teacher' | 'admin'
  embedded?: boolean
  renderExamPicker?: (exam?: IncidentsPage['exam']) => ReactNode
}) {
  const list = useIncidentConsultation(examId, mode)
  const [params] = useSearchParams()
  const scoped = new URLSearchParams(params)
  if (mode === 'admin') {
    scoped.set('from', 'admin')
    scoped.set('exam_id', String(examId))
  }
  const search = incidentConsultationSearch(scoped)
  const filters = {
    search: list.query.search,
    type: list.query.type,
    status: list.query.status,
    date_from: list.query.date_from,
    date_to: list.query.date_to,
  }
  const response = list.response
  const filtered = Object.values(filters).some((value) => value.trim())
  // AdminLayout already renders the admin page's main landmark; the teacher route needs its own.
  const Wrapper = embedded ? Fragment : PageContainer
  const content = (
    <Wrapper {...(embedded ? {} : { labelledBy: titleId })}>
      {!embedded && (
        <PageHeader
          title="Incidencias e ingresos irregulares"
          titleId={titleId}
          description={
            response
              ? `${response.exam.name} · ${response.exam.subject_name}`
              : 'Consulta los acontecimientos registrados para este examen.'
          }
          breadcrumbs={[
            {
              label: mode === 'admin' ? 'Administración' : 'Mis exámenes',
              to: mode === 'admin' ? '/admin' : '/teacher/exams',
            },
            { label: 'Incidencias' },
          ]}
        />
      )}
      {!embedded && mode === 'teacher' && (
        <ExamIncidentNavigation examId={examId} />
      )}
      {renderExamPicker?.(response?.exam)}
      {!embedded && (
        <div className={styles.access}>
          {mode === 'teacher' && response?.permissions.can_create && (
            <Link
              className={styles.primaryAction}
              to={`/exams/${examId}/incidents/create${search}`}
            >
              Registrar incidencia
            </Link>
          )}
          {mode === 'teacher' && (
            <Link to={`/exams/${examId}/entry-control?from=teacher`}>
              Control de ingreso
            </Link>
          )}
        </div>
      )}
      <IncidentConsultationFilters
        key={JSON.stringify(filters)}
        initial={filters}
        statuses={response?.filters.statuses ?? []}
        onApply={list.apply}
      />
      <div className={styles.resultsHeading}>
        <h2>Incidencias registradas</h2>
        {response?.permissions.can_export === true && (
          <IncidentExportActions
            key={search}
            examId={examId}
            query={list.query}
          />
        )}
      </div>
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
          mode === 'admin'
            ? `/admin/incidents/${examId}/${item.id}${search}`
            : `/exams/${examId}/incidents/${item.id}${search}`
        }
      />
      <p className={styles.note}>
        Una incidencia documenta lo ocurrido; no confirma una infracción ni
        aplica una sanción.
      </p>
    </Wrapper>
  )
  return embedded || mode === 'admin' ? content : <main>{content}</main>
}
