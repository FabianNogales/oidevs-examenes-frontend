import type { ReactNode } from 'react'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { ExamIncidentNavigation } from '@/features/incidents/components/ExamIncidentNavigation'
import type { InfractionExam } from '@/features/infractions/types/infraction.types'

// U3.4a: header and container come from PageHeader/PageContainer (Incidents.module.css unchanged).
const titleId = 'expulsion-page-title'
export function ExpulsionLayout({
  examId,
  exam,
  title,
  children,
  detail = false,
  embedded = false,
}: {
  examId: number
  exam?: InfractionExam
  title: string
  children: ReactNode
  detail?: boolean
  embedded?: boolean
}) {
  if (embedded) return <>{children}</>
  return (
    <main>
      <PageContainer labelledBy={titleId}>
        <PageHeader
          title={title}
          titleId={titleId}
          description={
            exam
              ? `${exam.name} · ${exam.subject_name}`
              : 'Decisiones de expulsión e historial del examen.'
          }
          breadcrumbs={[
            { label: 'Mis exámenes', to: '/teacher/exams' },
            ...(detail
              ? [
                  {
                    label: 'Incidencias e infracciones',
                    to: `/exams/${examId}/incidents?from=teacher&kind=expulsions`,
                  },
                ]
              : []),
            { label: title },
          ]}
        />
        <ExamIncidentNavigation examId={examId} />
        {children}
      </PageContainer>
    </main>
  )
}
