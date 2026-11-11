import { useSearchParams } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { IncidentExamPicker } from '../components/IncidentExamPicker'
import { ExamIncidentConsultation } from './ExamIncidentConsultation'
import { isPositiveId } from '../utils/incidentValidation'
import styles from './Incidents.module.css'

// U3.4b: header and container come from PageHeader/PageContainer (Incidents.module.css unchanged).
const titleId = 'admin-incidents-title'

export function AdminIncidentsPage() {
  const [params, setParams] = useSearchParams()
  const selected = params.has('exam_id') ? Number(params.get('exam_id')) : null
  function selectExam(id: number) {
    if (isPositiveId(id))
      setParams(new URLSearchParams({ from: 'admin', exam_id: String(id) }))
  }
  if (selected !== null && isPositiveId(selected))
    return (
      <ExamIncidentConsultation
        key={selected}
        examId={selected}
        mode="admin"
        renderExamPicker={(exam) => (
          <IncidentExamPicker
            selectedId={selected}
            exam={exam}
            onSelect={selectExam}
          />
        )}
      />
    )
  return (
    <PageContainer labelledBy={titleId}>
      <PageHeader
        title="Incidencias e ingresos irregulares"
        titleId={titleId}
        description="Selecciona un examen para consultar sus registros autorizados."
        breadcrumbs={[
          { label: 'Administración', to: '/admin' },
          { label: 'Incidencias' },
        ]}
      />
      {selected !== null && (
        <p role="alert">
          El identificador del examen no es válido. Selecciona otro examen.
        </p>
      )}
      <IncidentExamPicker selectedId={null} onSelect={selectExam} />
      <p className={styles.note}>
        Esta consulta no permite imponer sanciones ni modificar asistencias.
      </p>
    </PageContainer>
  )
}
