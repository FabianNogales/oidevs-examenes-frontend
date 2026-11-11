import type { ReactNode } from 'react'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { ExamIncidentNavigation } from '@/features/incidents/components/ExamIncidentNavigation'
import type { InfractionExam } from '../types/infraction.types'

// U3.4a: header and container come from PageHeader/PageContainer (Incidents.module.css unchanged).
const titleId = 'infraction-page-title'

export function InfractionLayout({
  examId,
  exam,
  title,
  children,
  detail = false,
}: {
  examId: number
  exam?: InfractionExam
  title: string
  children: ReactNode
  detail?: boolean
}) {
  return (
    <main>
      <PageContainer labelledBy={titleId}>
        <PageHeader
          title={title}
          titleId={titleId}
          description={
            exam
              ? `${exam.name} · ${exam.subject_name}`
              : 'Consulta y seguimiento de faltas del examen.'
          }
          breadcrumbs={[
            { label: 'Mis exámenes', to: '/teacher/exams' },
            ...(detail
              ? [
                  {
                    label: 'Infracciones',
                    to: `/teacher/exams/${examId}/infractions`,
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
