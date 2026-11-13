import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { Button } from '@/shared/components/ui/Button/Button'
import { useInfractionResource } from '@/features/infractions/hooks/useInfractionResource'
import { InvalidExamPage } from '@/features/exams/components/InvalidExamPage'
import { listCases } from './disciplineApi'
import { CaseForm } from './CaseForm'
function Content({ examId }: { examId: number }) {
  const navigate = useNavigate()
  const query = useInfractionResource(
    `case-create:${examId}`,
    useCallback(
      (signal) => listCases(examId, { per_page: 1 }, signal),
      [examId],
    ),
  )
  const back = `/exams/${examId}/incidents`
  return (
    <main>
      <PageContainer labelledBy="create-case-title">
        <PageHeader
          title="Registrar incidencia o infracción"
          titleId="create-case-title"
          description={query.data?.exam.name}
          breadcrumbs={[
            { label: 'Incidencias e infracciones', to: back },
            { label: 'Registrar caso' },
          ]}
        />
        {query.loading ? (
          <p role="status">Comprobando autorización…</p>
        ) : query.error ? (
          <div role="alert">
            <p>{query.error}</p>
            <Button onClick={query.retry}>Reintentar</Button>
          </div>
        ) : query.data?.permissions.can_create ? (
          <CaseForm
            context={query.data}
            onCancel={() => navigate(back)}
            onSaved={(result) =>
              navigate(`/exams/${examId}/cases/${result.data.id}`, {
                replace: true,
              })
            }
          />
        ) : (
          <p role="alert">
            No tienes autorización vigente para registrar casos.
          </p>
        )}
      </PageContainer>
    </main>
  )
}
export function CreateCasePage() {
  const { examId } = useParams(),
    id = Number(examId)
  return Number.isSafeInteger(id) && id > 0 ? (
    <Content key={id} examId={id} />
  ) : (
    <InvalidExamPage
      title="Registrar caso"
      message="El identificador del examen no es válido."
    />
  )
}
