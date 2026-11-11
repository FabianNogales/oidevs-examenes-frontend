import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { ExamIncidentNavigation } from '@/features/incidents/components/ExamIncidentNavigation'
import { useInfractionResource } from '@/features/infractions/hooks/useInfractionResource'
import { positiveId } from '@/features/infractions/utils/infractionValidation'
import { getReportCatalog } from '../api/examReportsApi'
import { ReportExamCatalog } from '../components/ReportExamCatalog'
import { ReportWorkspace } from '../components/ReportWorkspace'
import type { ReportExam } from '../types/report.types'
import type { ReactNode } from 'react'
import { InvalidExamPage } from '@/features/exams/components/InvalidExamPage'

// U3.4c: header and container come from PageHeader/PageContainer (Incidents.module.css unchanged).
const titleId = 'exam-reports-title'
function Layout({
  role,
  examId,
  children,
}: {
  role: 'teacher' | 'admin'
  examId?: number
  children: ReactNode
}) {
  // AdminLayout already renders the page's main landmark; teacher routes (AppLayout) need their own.
  const content = (
    <PageContainer labelledBy={titleId}>
      <PageHeader
        title="Reportes de exámenes"
        titleId={titleId}
        description="Consulta y descarga información oficial con el alcance autorizado de tu cuenta."
        breadcrumbs={[
          {
            label: role === 'admin' ? 'Administración' : 'Mis exámenes',
            to: role === 'admin' ? '/admin' : '/teacher/exams',
          },
          { label: 'Reportes de exámenes' },
        ]}
      />
      {role === 'teacher' && examId && (
        <ExamIncidentNavigation examId={examId} />
      )}
      {children}
    </PageContainer>
  )
  return role === 'admin' ? content : <main>{content}</main>
}
function Fixed({ examId }: { examId: number }) {
  const navigate = useNavigate(),
    load = useCallback(
      (signal: AbortSignal) =>
        getReportCatalog({ exam_id: examId, search: '', page: 1 }, signal),
      [examId],
    ),
    q = useInfractionResource(`report-exam:${examId}`, load)
  return (
    <Layout role="teacher" examId={examId}>
      {q.loading ? (
        <p role="status">Consultando el examen y sus permisos…</p>
      ) : q.error ? (
        <div role="alert">
          <p>{q.error}</p>
          <button type="button" onClick={q.retry}>
            Reintentar
          </button>
        </div>
      ) : q.data?.data[0] ? (
        <ReportWorkspace
          key={examId}
          exam={q.data.data[0]}
          onChangeExam={() => void navigate('/teacher/exam-reports')}
        />
      ) : (
        <p role="alert">
          El examen no está disponible dentro de tu alcance autorizado.
        </p>
      )}
    </Layout>
  )
}
function Catalog({ role }: { role: 'teacher' | 'admin' }) {
  const [exam, setExam] = useState<ReportExam | null>(null)
  return (
    <Layout role={role}>
      {exam ? (
        <ReportWorkspace
          key={exam.id}
          exam={exam}
          onChangeExam={() => setExam(null)}
        />
      ) : (
        <ReportExamCatalog onSelect={setExam} />
      )}
    </Layout>
  )
}
export function TeacherExamReportsPage() {
  const { examId } = useParams()
  if (examId !== undefined)
    return positiveId(Number(examId)) ? (
      <Fixed key={examId} examId={Number(examId)} />
    ) : (
      <InvalidExamPage
        title="Reportes de exámenes"
        message="El identificador del examen no es válido."
      />
    )
  return <Catalog role="teacher" />
}
export function AdminExamReportsPage() {
  return <Catalog role="admin" />
}
