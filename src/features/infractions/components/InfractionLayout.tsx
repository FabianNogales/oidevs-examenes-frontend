import type { ReactNode } from 'react'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { ExamIncidentNavigation } from '@/features/incidents/components/ExamIncidentNavigation'
import type { InfractionExam } from '../types/infraction.types'
import styles from '@/features/incidents/pages/Incidents.module.css'

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
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[
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
        <header className={styles.heading}>
          <h1>{title}</h1>
          <p>
            {exam
              ? `${exam.name} · ${exam.subject_name}`
              : 'Consulta y seguimiento de faltas del examen.'}
          </p>
        </header>
        <ExamIncidentNavigation examId={examId} />
        {children}
      </section>
    </main>
  )
}
