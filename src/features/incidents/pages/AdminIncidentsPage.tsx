import { useSearchParams } from 'react-router'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import { IncidentExamPicker } from '../components/IncidentExamPicker'
import { ExamIncidentConsultation } from './ExamIncidentConsultation'
import { isPositiveId } from '../utils/incidentValidation'
import styles from './Incidents.module.css'

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
    <section className={styles.page}>
      <div className={styles.content}>
        <Breadcrumbs
          items={[
            { label: 'Administración', to: '/admin' },
            { label: 'Incidencias' },
          ]}
        />
        <header className={styles.heading}>
          <h1>Incidencias e ingresos irregulares</h1>
          <p>Selecciona un examen para consultar sus registros autorizados.</p>
        </header>
        {selected !== null && (
          <p role="alert">
            El identificador del examen no es válido. Selecciona otro examen.
          </p>
        )}
        <IncidentExamPicker selectedId={null} onSelect={selectExam} />
        <p className={styles.note}>
          Esta consulta no permite imponer sanciones ni modificar asistencias.
        </p>
      </div>
    </section>
  )
}
