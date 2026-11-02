import { Link, useParams, useSearchParams } from 'react-router'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { ExamIncidentNavigation } from '../components/ExamIncidentNavigation'
import { useIncidents } from '../hooks/useIncidents'
import type { Incident } from '../types/incident.types'
import { INCIDENT_TYPE_LABELS, isPositiveId } from '../utils/incidentValidation'
import styles from './Incidents.module.css'

// Incidents have their own states; do not map them to the shared ACTIVE/INACTIVE catalog status.
type IncidentRow = Omit<Incident, 'status'>
const columns: TableColumnDef<IncidentRow>[] = [
  {
    id: 'type',
    header: 'Incidencia / tipo',
    cell: (item) => (
      <>
        <strong>
          #{item.id} · {INCIDENT_TYPE_LABELS[item.type]}
        </strong>
        <span className={styles.secondary}>{item.description}</span>
      </>
    ),
  },
  {
    id: 'student',
    header: 'Estudiante',
    cell: (item) =>
      item.student ? (
        <>
          {item.student.first_names} {item.student.last_names}
          <span className={styles.secondary}>SIS {item.student.sis_code}</span>
        </>
      ) : (
        'Sin estudiante identificado'
      ),
  },
  {
    id: 'origin',
    header: 'Origen',
    cell: (item) => (item.origin === 'MANUAL' ? 'Manual' : 'Automático'),
  },
  {
    id: 'date',
    header: 'Fecha y hora',
    cell: (item) =>
      new Intl.DateTimeFormat('es-BO', {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: 'America/La_Paz',
      }).format(new Date(item.created_at)),
  },
  {
    id: 'author',
    header: 'Registrado por',
    cell: (item) => item.reported_by.name,
  },
]

function IncidentsContent({ examId }: { examId: number }) {
  const [params] = useSearchParams()
  const teacherOrigin = params.get('from') === 'teacher'
  const list = useIncidents(examId)
  const response = list.response
  const meta = response?.meta
  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
            {
              label: teacherOrigin ? 'Mis exámenes' : 'Colaborador',
              to: teacherOrigin ? '/teacher/exams' : '/collaborator',
            },
            { label: 'Incidencias' },
          ]}
        />
        <header className={styles.heading}>
          <h1>Incidencias del examen</h1>
          {response ? (
            <p>
              {response.exam.name} · {response.exam.subject_name}
            </p>
          ) : null}
        </header>
        {teacherOrigin && response ? (
          <ExamIncidentNavigation examId={examId} />
        ) : null}
        <div className={styles.access}>
          {response?.permissions.can_create ? (
            <Link
              to={`/exams/${examId}/incidents/create${teacherOrigin ? '?from=teacher' : ''}`}
            >
              Registrar incidencia
            </Link>
          ) : null}
          <Link
            to={`/exams/${examId}/entry-control${teacherOrigin ? '?from=teacher' : ''}`}
          >
            Control de ingreso
          </Link>
        </div>
        <DataTable<IncidentRow>
          columns={columns}
          data={response?.data ?? []}
          loading={list.loading}
          error={list.error}
          onRetry={list.retry}
          entityLabel="incidencias"
          emptyTitle="No hay incidencias registradas"
          emptyDescription="Aquí se mostrarán los reportes manuales y eventos automáticos conservados por el servidor."
          pagination={
            meta
              ? {
                  currentPage: meta.current_page,
                  lastPage: meta.last_page,
                  total: meta.total,
                }
              : null
          }
          onPageChange={list.setPage}
        />
        <p className={styles.note}>
          Una incidencia documenta lo ocurrido; no confirma una infracción ni
          aplica una sanción. Horarios de Bolivia (UTC−4).
        </p>
      </section>
    </main>
  )
}

export function ExamIncidentsPage() {
  const { examId } = useParams()
  const id = Number(examId)
  if (!isPositiveId(id))
    return (
      <main className={styles.page}>
        <h1>Incidencias</h1>
        <p role="alert">El identificador del examen no es válido.</p>
      </main>
    )
  return <IncidentsContent key={id} examId={id} />
}
