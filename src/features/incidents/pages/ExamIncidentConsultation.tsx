import { Link, useSearchParams } from 'react-router'
import type { ReactNode } from 'react'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { ExamIncidentNavigation } from '../components/ExamIncidentNavigation'
import { IncidentConsultationFilters } from '../components/IncidentConsultationFilters'
import { IncidentConsultationSummary } from '../components/IncidentConsultationSummary'
import { IncidentRecordsTable } from '../components/IncidentRecordsTable'
import { useIncidentConsultation } from '../hooks/useIncidentConsultation'
import { incidentConsultationSearch } from '../utils/incidentConsultationNavigation'
import styles from './Incidents.module.css'
import { IncidentExportActions } from '../components/IncidentExportActions'
import type { IncidentsPage } from '../types/incident.types'

export function ExamIncidentConsultation({
  examId,
  mode = 'teacher',
  renderExamPicker,
}: {
  examId: number
  mode?: 'teacher' | 'admin'
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
  const Container = mode === 'admin' ? 'section' : 'main'
  return (
    <Container className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
            {
              label: mode === 'admin' ? 'Administración' : 'Mis exámenes',
              to: mode === 'admin' ? '/admin' : '/teacher/exams',
            },
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
        {mode === 'teacher' && <ExamIncidentNavigation examId={examId} />}
        {renderExamPicker?.(response?.exam)}
        <div className={styles.access}>
          {mode === 'teacher' && response?.permissions.can_create && (
            <Link to={`/exams/${examId}/incidents/create${search}`}>
              Registrar incidencia
            </Link>
          )}
          {mode === 'teacher' && (
            <Link to={`/exams/${examId}/entry-control?from=teacher`}>
              Control de ingreso
            </Link>
          )}
        </div>
        {response?.permissions.can_export === true && (
          <IncidentExportActions
            key={search}
            examId={examId}
            query={list.query}
          />
        )}
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
            mode === 'admin'
              ? `/admin/incidents/${examId}/${item.id}${search}`
              : `/exams/${examId}/incidents/${item.id}${search}`
          }
        />
        <p className={styles.note}>
          Una incidencia documenta lo ocurrido; no confirma una infracción ni
          aplica una sanción. Los contadores proceden del servidor. Horarios de
          Bolivia (UTC−4).
        </p>
      </section>
    </Container>
  )
}
