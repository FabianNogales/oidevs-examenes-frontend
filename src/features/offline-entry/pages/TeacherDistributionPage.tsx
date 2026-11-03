import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, GitBranch, RefreshCw, UserCheck, Users,} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useExamDetail } from '@/features/exams/hooks/useExamDetail'
import { ExamInformation } from '@/features/exams/components/ExamInformation'
import { ExamsSkeleton } from '@/features/exams/components/ExamsSkeleton'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { useOfflineAssignments } from '../hooks/useOfflineAssignments'
import { useConnectivity } from '../hooks/useConnectivity'
import { OfflineAssignmentCards } from '../components/OfflineAssignmentCards'
import { OfflineConnectionStatus } from '../components/OfflineConnectionStatus'
import { parseExamId } from '@/features/exams/api/examDetailsApi'
import shared from '../components/styles/OfflineShared.module.css'
import distStyles from '../components/styles/OfflineDistribution.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

function DistributionContent({ examId }: { examId: number }) {
  const { user, notify } = useAuth()
  const exam = useExamDetail(examId)
  const online = useConnectivity()
  const lists = useOfflineAssignments(examId, exam.detail !== null)
  const [confirmation, setConfirmation] = useState(false)
  const total =
    lists.distribution?.lists.reduce(
      (sum, list) => sum + list.student_count,
      0,
    ) ?? lists.counts.students
  const noCollaborators = lists.distribution
    ? lists.distribution.lists.length === 1 &&
      lists.distribution.lists[0].responsible_id === user?.id
    : lists.counts.collaborators === 0
  const ended = exam.detail
    ? Date.now() >=
      Date.parse(`${exam.detail.exam_date}T${exam.detail.start_time}-04:00`) +
        exam.detail.duration_minutes * 60000
    : true
  const canPrepare =
    online &&
    exam.detail &&
    ['SCHEDULED', 'ACTIVE', 'IN_PROGRESS'].includes(exam.detail.status) &&
    !ended &&
    !lists.loading &&
    !lists.error
  return (
    <main className={shared.page}>
      <Breadcrumbs
        items={[
          { label: 'Mis exámenes', to: '/teacher/exams' },
          { label: 'Examen', to: `/teacher/exams/${examId}` },
          { label: 'Distribución de listas' },
        ]}
      />
      <header className={shared.header}>
        <div>
          <p className={shared.eyebrow}>HU35 · Organización del ingreso</p>
          <h1>Distribución de estudiantes</h1>
          <p>Listas exclusivas y consecutivas por apellidos.</p>
        </div>
        <OfflineConnectionStatus online={online} />
      </header>
      {exam.isLoading ? <ExamsSkeleton /> : null}
      {exam.errorMessage ? (
        <div className={shared.error} role="alert">
          <p>{exam.errorMessage}</p>
          <button className={buttons.secondaryButton} onClick={exam.reload}>
            Reintentar examen
          </button>
        </div>
      ) : null}
      {exam.exam ? <ExamInformation exam={exam.exam} /> : null}
      {exam.detail ? (
        <>
          <div className={distStyles.metricsRow}>
            <div className={distStyles.metricCard}>
              <div className={distStyles.metricCardTop}>
                <strong>{total ?? '—'}</strong>
                <span className={distStyles.metricCardIcon} aria-hidden="true">
                  <Users size={18} strokeWidth={1.75} />
                </span>
              </div>
              <span>
                Estudiantes inscritos{total === null ? ' · por consultar' : ''}
              </span>
            </div>

            <div className={distStyles.metricCard}>
              <div className={distStyles.metricCardTop}>
                <strong>
                  {lists.distribution
                    ? lists.distribution.lists.filter(
                        (list) => list.responsible_id !== user?.id,
                      ).length
                    : (lists.counts.collaborators ?? '—')}
                </strong>
                <span className={distStyles.metricCardIcon} aria-hidden="true">
                  <UserCheck size={18} strokeWidth={1.75} />
                </span>
              </div>
              <span>
                {lists.distribution
                  ? 'Colaboradores con lista'
                  : 'Colaboradores registrados'}
              </span>
            </div>

            <div className={distStyles.metricCard}>
              <div className={distStyles.metricCardTop}>
                <strong>
                  {lists.distribution ? `v${lists.distribution.version}` : '—'}
                </strong>
                <span className={distStyles.metricCardIcon} aria-hidden="true">
                  <GitBranch size={18} strokeWidth={1.75} />
                </span>
              </div>
              <span>
                {lists.distribution
                  ? 'Distribución preparada'
                  : 'Sin distribución confirmada'}
              </span>
            </div>
          </div>
          {noCollaborators ? (
            <p className={shared.notice}>
              No hay colaboradores en esta distribución. El servidor asigna la
              lista al docente responsable.
            </p>
          ) : null}
          {lists.error ? (
            <p className={shared.error} role="alert">
              {lists.error}
            </p>
          ) : null}

          <section className={shared.panel}>
            <div className={shared.toolbar}>
              <div>
                <h2>
                  {lists.distribution
                    ? 'Distribución preparada'
                    : 'Preparar listas del examen'}
                </h2>
                <p className={shared.panelSubtitle}>
                  {lists.distribution
                    ? 'La versión 1 está congelada. Puedes consultar sus estudiantes y responsables.'
                    : 'El servidor calculará las listas equilibradas según las inscripciones y autorizaciones vigentes.'}
                </p>
              </div>
              <button
                className={buttons.secondaryButton}
                disabled={lists.loading || lists.preparing || !online}
                onClick={lists.reload}
              >
                <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>Actualizar consulta</span>
              </button>
            </div>
            {lists.loading ? (
              <p role="status">Consultando distribución…</p>
            ) : null}
            {!lists.loading && !lists.distribution ? (
              <button
                className={buttons.primaryButton}
                disabled={!canPrepare || lists.preparing}
                onClick={() => setConfirmation(true)}
              >
                Preparar listas
              </button>
            ) : null}
            {lists.distribution ? (
              <Link className={shared.link} to={`/exams/${examId}/offline`}>
                <span>
                  Preparar mi dispositivo para el control sin conexión
                </span>
                <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            ) : null}
            {!lists.distribution && total === 0 ? (
              <p className={shared.muted}>
                El examen no tiene inscripciones activas. Las listas que se
                preparen estarán vacías y quedarán congeladas.
              </p>
            ) : null}
          </section>
          {lists.distribution ? (
            <OfflineAssignmentCards distribution={lists.distribution} />
          ) : null}
        </>
      ) : null}
      {confirmation ? (
        <CollaborationModal
          title="Preparar listas exclusivas"
          busy={lists.preparing}
          onClose={() => setConfirmation(false)}
        >
          <p>
            Se distribuirán los estudiantes inscritos entre los colaboradores
            vigentes. Si no hay colaboradores, la lista será del docente
            responsable.
          </p>
          <p>
            La primera distribución queda congelada en versión 1. Esta operación
            no permite reasignar ni regenerar estudiantes después.
          </p>
          <div className={shared.actions}>
            <button
              className={buttons.secondaryButton}
              disabled={lists.preparing}
              onClick={() => setConfirmation(false)}
            >
              Cancelar
            </button>
            <button
              className={buttons.primaryButton}
              disabled={lists.preparing || !canPrepare}
              onClick={() => {
                void lists.prepare().then((prepared) => {
                  setConfirmation(false)
                  if (prepared)
                    notify(
                      'success',
                      'Distribución preparada y guardada en el servidor.',
                    )
                })
              }}
            >
              {lists.preparing ? 'Preparando…' : 'Confirmar preparación'}
            </button>
          </div>
        </CollaborationModal>
      ) : null}
    </main>
  )
}
export function TeacherDistributionPage() {
  const { examId } = useParams()
  const id = parseExamId(examId)
  return id === null ? (
    <main className={shared.page}>
      <p role="alert">El examen no es válido.</p>
    </main>
  ) : (
    <DistributionContent key={id} examId={id} />
  )
}