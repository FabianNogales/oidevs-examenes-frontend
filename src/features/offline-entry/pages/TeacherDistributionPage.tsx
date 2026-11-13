import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useExamDetail } from '@/features/exams/hooks/useExamDetail'
import { ExamInformation } from '@/features/exams/components/ExamInformation'
import { ExamsSkeleton } from '@/features/exams/components/ExamsSkeleton'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { parseExamId } from '@/features/exams/api/examDetailsApi'
import { useOfflineAssignments } from '../hooks/useOfflineAssignments'
import { useConnectivity } from '../hooks/useConnectivity'
import { AssignedListStudentsView } from '../components/AssignedListStudentsView'
import { DistributionActionBanner } from '../components/DistributionActionBanner'
import { DistributionSummaryMetrics } from '../components/DistributionSummaryMetrics'
import { OfflineAssignmentCards } from '../components/OfflineAssignmentCards'
import { OfflineConnectionStatus } from '../components/OfflineConnectionStatus'
import shared from '../components/OfflineShared.module.css'
import distStyles from '../components/OfflineDistribution.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

// U3.5: header and container come from PageHeader/PageContainer (OfflineShared.module.css unchanged).
const titleId = 'teacher-distribution-title'

function DistributionContent({ examId }: { examId: number }) {
  const navigate = useNavigate()
  const { user, notify } = useAuth()
  const exam = useExamDetail(examId)
  const online = useConnectivity()
  const lists = useOfflineAssignments(examId, exam.detail !== null)
  const [confirmation, setConfirmation] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedListIdParam = Number(searchParams.get('listId'))
  const selectedListIndex = lists.distribution
    ? lists.distribution.lists.findIndex(
        (item) => item.list_id === selectedListIdParam,
      )
    : -1
  const selectedList =
    selectedListIndex >= 0 && lists.distribution
      ? lists.distribution.lists[selectedListIndex]
      : null

  const totalStudents =
    lists.distribution?.lists.reduce(
      (sum, list) => sum + list.student_count,
      0,
    ) ?? lists.counts.students

  const collaboratorsCount = lists.distribution
    ? lists.distribution.lists.filter(
        (list) => list.responsible_id !== user?.id,
      ).length
    : lists.counts.collaborators

  const noCollaborators = lists.distribution
    ? lists.distribution.lists.length === 1 &&
      lists.distribution.lists[0].responsible_id === user?.id
    : lists.counts.collaborators === 0

  const ended = exam.detail
    ? Date.now() >=
      Date.parse(`${exam.detail.exam_date}T${exam.detail.start_time}-04:00`) +
        exam.detail.duration_minutes * 60000
    : true

  const canPrepare = Boolean(
    online &&
      exam.detail &&
      ['SCHEDULED', 'ACTIVE', 'IN_PROGRESS'].includes(exam.detail.status) &&
      !ended &&
      !lists.loading &&
      !lists.error,
  )

  // Vista de página completa cuando se selecciona "Consultar estudiantes"
  if (selectedList && lists.distribution) {
    const subjectName =
      exam.exam?.subject_name ??
      exam.detail?.subject_name ??
      'Materia asignada'
    const examTitle = exam.exam?.name ?? exam.detail?.name ?? `Examen ${examId}`

    return (
      <main>
        <PageContainer labelledBy={titleId}>
          <PageHeader
            title={`Lista ${selectedListIndex + 1} de estudiantes`}
            titleId={titleId}
            description={`${subjectName} · ${examTitle}`}
            breadcrumbs={[
              { label: 'Mis exámenes', to: '/teacher/exams' },
              { label: 'Examen', to: `/teacher/exams/${examId}` },
              {
                label: 'Distribución de listas',
                to: `/teacher/exams/${examId}/offline/assignments`,
              },
              { label: `Lista ${selectedListIndex + 1}` },
            ]}
          />

          <AssignedListStudentsView
            list={selectedList}
            listPosition={selectedListIndex + 1}
            version={lists.distribution.version}
            subjectName={subjectName}
            examName={examTitle}
            onBack={() => setSearchParams({}, { replace: false })}
          />
        </PageContainer>
      </main>
    )
  }

  return (
    <main>
      <PageContainer labelledBy={titleId}>
        <PageHeader
          title="Distribución de estudiantes"
          titleId={titleId}
          description="Listas exclusivas y consecutivas por apellidos."
          breadcrumbs={[
            { label: 'Mis exámenes', to: '/teacher/exams' },
            { label: 'Examen', to: `/teacher/exams/${examId}` },
            { label: 'Distribución de listas' },
          ]}
          actions={
            <>
              {/* Botón superior para volver a la lista de exámenes */}
              <button
                type="button"
                className={distStyles.backButton}
                onClick={() => void navigate(`/teacher/exams`)}
              >
                <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
                <span>Volver a mis exámenes</span>
              </button>
              <OfflineConnectionStatus online={online} />
            </>
          }
        />

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
            <DistributionSummaryMetrics
              totalStudents={totalStudents}
              collaboratorsCount={collaboratorsCount}
              hasPreparedDistribution={lists.distribution !== null}
              distributionVersion={lists.distribution?.version ?? null}
            />

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

            <DistributionActionBanner
              examId={examId}
              isPrepared={lists.distribution !== null}
              isLoading={lists.loading}
              isPreparing={lists.preparing}
              isOnline={online}
              canPrepare={canPrepare}
              totalStudents={totalStudents}
              onReload={lists.reload}
              onRequestPrepare={() => setConfirmation(true)}
            />

            {lists.distribution ? (
              <OfflineAssignmentCards
                distribution={lists.distribution}
                onSelectList={(listId) =>
                  setSearchParams({ listId: String(listId) })
                }
              />
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
      </PageContainer>
    </main>
  )
}

export function TeacherDistributionPage() {
  const { examId } = useParams()
  const id = parseExamId(examId)
  return id === null ? (
    <main>
      <PageContainer labelledBy={titleId}>
        <PageHeader title="Distribución de estudiantes" titleId={titleId} />
        <p role="alert">El examen no es válido.</p>
      </PageContainer>
    </main>
  ) : (
    <DistributionContent key={id} examId={id} />
  )
}