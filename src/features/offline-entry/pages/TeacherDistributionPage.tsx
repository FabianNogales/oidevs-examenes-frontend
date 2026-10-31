import { useState } from 'react'
import { Link, useParams } from 'react-router'
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
import styles from '../components/OfflineEntry.module.css'
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
    <main className={styles.page}>
      <Breadcrumbs
        items={[
          { label: 'Mis exámenes', to: '/teacher/exams' },
          { label: 'Examen', to: `/teacher/exams/${examId}` },
          { label: 'Distribución de listas' },
        ]}
      />
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>HU35 · Organización del ingreso</p>
          <h1>Distribución de estudiantes</h1>
          <p>Listas exclusivas y consecutivas por apellidos.</p>
        </div>
        <OfflineConnectionStatus online={online} />
      </header>
      {exam.isLoading ? <ExamsSkeleton /> : null}
      {exam.errorMessage ? (
        <div className={styles.error} role="alert">
          <p>{exam.errorMessage}</p>
          <button className={buttons.secondaryButton} onClick={exam.reload}>
            Reintentar examen
          </button>
        </div>
      ) : null}
      {exam.exam ? <ExamInformation exam={exam.exam} /> : null}
      {exam.detail ? (
        <>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <strong>{total ?? '—'}</strong>
              <span>
                Estudiantes inscritos{total === null ? ' · por consultar' : ''}
              </span>
            </div>
            <div className={styles.metric}>
              <strong>
                {lists.distribution
                  ? lists.distribution.lists.filter(
                      (list) => list.responsible_id !== user?.id,
                    ).length
                  : (lists.counts.collaborators ?? '—')}
              </strong>
              <span>
                {lists.distribution
                  ? 'Colaboradores con lista'
                  : 'Colaboradores registrados'}
              </span>
            </div>
            <div className={styles.metric}>
              <strong>
                {lists.distribution ? `v${lists.distribution.version}` : '—'}
              </strong>
              <span>
                {lists.distribution
                  ? 'Distribución preparada'
                  : 'Sin distribución confirmada'}
              </span>
            </div>
          </div>
          {noCollaborators ? (
            <p className={styles.notice}>
              No hay colaboradores en esta distribución. El servidor asigna la
              lista al docente responsable.
            </p>
          ) : null}
          {lists.error ? (
            <p className={styles.error} role="alert">
              {lists.error}
            </p>
          ) : null}
          <section className={styles.panel}>
            <div className={styles.toolbar}>
              <div>
                <h2>
                  {lists.distribution
                    ? 'Distribución preparada'
                    : 'Preparar listas del examen'}
                </h2>
                <p>
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
                Actualizar consulta
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
              <Link className={styles.link} to={`/exams/${examId}/offline`}>
                Preparar mi dispositivo para el control sin conexión
              </Link>
            ) : null}
            {!lists.distribution && total === 0 ? (
              <p className={styles.muted}>
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
          <div className={styles.actions}>
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
    <main className={styles.page}>
      <p role="alert">El examen no es válido.</p>
    </main>
  ) : (
    <DistributionContent key={id} examId={id} />
  )
}
