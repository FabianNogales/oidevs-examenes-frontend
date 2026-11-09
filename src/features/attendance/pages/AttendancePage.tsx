import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { ExamIncidentNavigation } from '@/features/incidents/components/ExamIncidentNavigation'
import { positiveId } from '@/features/infractions/utils/infractionValidation'
import { getAttendanceStudents } from '../api/attendanceApi'
import { useAttendanceFeed } from '../hooks/useAttendanceFeed'
import { AttendanceSummary } from '../components/AttendanceSummary'
import { AttendanceFilters } from '../components/AttendanceFilters'
import { AttendanceStudents } from '../components/AttendanceStudents'
import { AttendanceActivity } from '../components/AttendanceActivity'
import type { AttendanceQuery } from '../types/attendance.types'
import styles from './Attendance.module.css'
import { InvalidExamPage } from '@/features/exams/components/InvalidExamPage'

// U3.4c: header and container come from PageHeader/PageContainer (Incidents.module.css unchanged).
const titleId = 'attendance-title'
function Followup({ examId }: { examId: number }) {
  const [params, setParams] = useSearchParams(),
    [activity, setActivity] = useState(false)
  const query: AttendanceQuery = {
    view: (params.get('view') ?? 'all') as AttendanceQuery['view'],
    search: params.get('search') ?? '',
    page: Number(params.get('page') ?? 1),
    ...(params.has('list_id')
      ? { list_id: Number(params.get('list_id')) }
      : {}),
  }
  const key = JSON.stringify(query)
  const load = useCallback(
    (signal: AbortSignal) =>
      getAttendanceStudents(examId, JSON.parse(key) as AttendanceQuery, signal),
    [examId, key],
  )
  const feed = useAttendanceFeed(`students:${examId}:${key}`, load),
    r = feed.data
  useEffect(() => {
    if (r && query.page > r.meta.last_page) {
      const next = new URLSearchParams(params)
      next.delete('page')
      setParams(next, { replace: true })
    }
  }, [r, query.page, params, setParams])
  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params)
    next.delete('page')
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next)
  }
  return (
    <main>
      <PageContainer labelledBy={titleId}>
        <PageHeader
          title="Asistencia del examen"
          titleId={titleId}
          description={
            r?.exam.name ??
            'Supervisa los ingresos oficiales y el avance del examen.'
          }
          breadcrumbs={[
            { label: 'Mis exámenes', to: '/teacher/exams' },
            { label: 'Asistencia' },
          ]}
        />
        <ExamIncidentNavigation examId={examId} />
        <div className={styles.toolbar}>
          <p>
            Actualización automática mientras esta pantalla esté visible y
            tengas conexión.
          </p>
          <button type="button" onClick={feed.retry} disabled={feed.refreshing}>
            Actualizar ahora
          </button>
        </div>
        {feed.paused ? (
          <div className={styles.panel} role="status">
            Consulta pausada. No se presentan cifras vigentes sin conexión. Se
            actualizará al recuperar la conexión y volver a esta pantalla.
          </div>
        ) : feed.error ? (
          <div className={styles.panel} role="alert">
            <h2>No se pudo confirmar la asistencia vigente</h2>
            <p>{feed.error}</p>
            <button type="button" onClick={feed.retry}>
              Reintentar consulta
            </button>
          </div>
        ) : r ? (
          <AttendanceSummary snapshot={r} refreshing={feed.refreshing} />
        ) : (
          <p role="status">Consultando asistencia oficial…</p>
        )}
        <div
          className={styles.tabs}
          role="group"
          aria-label="Vista de seguimiento"
        >
          <button
            type="button"
            aria-pressed={!activity}
            onClick={() => setActivity(false)}
          >
            Estudiantes
          </button>
          <button
            type="button"
            aria-pressed={activity}
            onClick={() => setActivity(true)}
          >
            Colaboradores y listas
          </button>
        </div>
        {activity ? (
          <AttendanceActivity
            examId={examId}
            onList={(id) => {
              update({ list_id: String(id), view: 'all', search: '' })
              setActivity(false)
            }}
          />
        ) : (
          <section className={styles.section}>
            <h2>Estudiantes del examen</h2>
            <AttendanceFilters
              key={query.search}
              view={query.view}
              search={query.search}
              onChange={update}
            />
            {query.list_id && (
              <div className={styles.toolbar}>
                <p>
                  {r?.selected_list
                    ? `${r.selected_list.name} · ${r.selected_list.registered} de ${r.selected_list.total_students} ingresados · ${r.selected_list.attendance_percentage}%`
                    : 'Consultando lista seleccionada…'}
                </p>
                <button type="button" onClick={() => update({ list_id: '' })}>
                  Ver todas las listas
                </button>
              </div>
            )}
            <AttendanceStudents
              page={r}
              loading={feed.refreshing && !r && !feed.error}
              error={
                feed.paused
                  ? 'Consulta pausada: recupera la conexión y vuelve a esta pantalla para actualizar.'
                  : feed.error
              }
              onRetry={feed.retry}
              onPage={(page) => {
                const next = new URLSearchParams(params)
                next.set('page', String(page))
                setParams(next)
              }}
            />
          </section>
        )}
      </PageContainer>
    </main>
  )
}
export function AttendancePage() {
  const { examId } = useParams()
  const id = Number(examId)
  return positiveId(id) ? (
    <Followup key={id} examId={id} />
  ) : (
    <InvalidExamPage
      title="Asistencia del examen"
      message="El identificador del examen no es válido."
    />
  )
}
