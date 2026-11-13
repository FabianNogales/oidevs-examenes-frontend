import { useCallback } from 'react'
import { useParams } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { Button } from '@/shared/components/ui/Button/Button'
import { ButtonLink } from '@/shared/components/ui/Button/ButtonLink'
import { useInfractionResource } from '@/features/infractions/hooks/useInfractionResource'
import { InvalidExamPage } from '@/features/exams/components/InvalidExamPage'
import { getCase } from './disciplineApi'
import { CaseDetails } from './CaseDetails'
import { CaseFollowup } from './CaseFollowup'
function Content({ examId, caseId }: { examId: number; caseId: number }) {
  const query = useInfractionResource(
    `case:${examId}:${caseId}`,
    useCallback((signal) => getCase(examId, caseId, signal), [examId, caseId]),
  )
  return (
    <main>
      <PageContainer labelledBy="case-detail-title">
        <PageHeader
          title="Detalle del caso"
          titleId="case-detail-title"
          description={query.data?.exam.name}
          breadcrumbs={[
            {
              label: 'Incidencias e infracciones',
              to: `/exams/${examId}/incidents`,
            },
            { label: `Caso #${caseId}` },
          ]}
        />
        {query.loading ? (
          <p role="status">Consultando caso…</p>
        ) : query.error ? (
          <div role="alert">
            <p>{query.error}</p>
            <Button onClick={query.retry}>Reintentar</Button>
          </div>
        ) : (
          query.data && (
            <>
              <CaseDetails record={query.data.data} onRefresh={query.retry} />
              {query.data.data.kind === 'INFRACTION' &&
                query.data.permissions.can_manage && (
                  <CaseFollowup
                    record={query.data.data}
                    onRefresh={query.retry}
                  />
                )}
            </>
          )
        )}
        <ButtonLink variant="secondary" to={`/exams/${examId}/incidents`}>
          Volver a los casos del examen
        </ButtonLink>
      </PageContainer>
    </main>
  )
}
export function CaseDetailPage() {
  const params = useParams(),
    examId = Number(params.examId),
    caseId = Number(params.caseId)
  return [examId, caseId].every((id) => Number.isSafeInteger(id) && id > 0) ? (
    <Content key={`${examId}:${caseId}`} examId={examId} caseId={caseId} />
  ) : (
    <InvalidExamPage
      title="Detalle del caso"
      message="El examen o el caso no son válidos."
    />
  )
}
