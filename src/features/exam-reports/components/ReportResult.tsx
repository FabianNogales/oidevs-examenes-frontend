import type {
  ExamReportPage,
  ReportExam,
  ReportFilters,
} from '../types/report.types'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import { REPORT_LABELS } from '../utils/reportValidation'
import { ReportRecords } from './ReportRecords'
import { ReportExportActions } from './ReportExportActions'
import styles from '../pages/ExamReports.module.css'
export function ReportResult({
  exam,
  filters,
  page,
  onPage,
}: {
  exam: ReportExam
  filters: ReportFilters
  page: ExamReportPage
  onPage: (page: number) => void
}) {
  const r = page.report
  return (
    <section className={styles.panel} aria-label="Reporte generado">
      <h2>{REPORT_LABELS[r.type]}</h2>
      <p>
        <strong>Generado:</strong> {formatIncidentDate(r.generated_at)} · Hora
        de Bolivia
      </p>
      <p>
        <strong>Alcance:</strong> {page.exam.name} · {page.exam.subject.name} (
        {page.exam.subject.code}) · {page.exam.academic_term.name}
      </p>
      <div className={styles.counts}>
        <p>
          <strong>{r.total_participants}</strong> inscritos oficiales del examen
        </p>
        <p>
          <strong>{r.total_records}</strong> registros en este reporte
        </p>
      </div>
      {r.type === 'PENDING_ABSENT' && (
        <p>
          {r.pending_classification === 'ABSENT'
            ? 'Ausentes según la finalización de la evaluación.'
            : r.pending_classification === 'PENDING'
              ? 'Pendientes de ingreso: todavía no se clasifican como ausentes.'
              : 'No corresponde clasificar ausencias en este examen.'}
        </p>
      )}
      <p>
        Los ingresos offline pendientes de sincronización y aceptación no se
        incluyen como asistencias oficiales.
      </p>
      <ReportExportActions
        key={`${r.id}:${page.meta.current_page}`}
        exam={exam}
        filters={filters}
        page={page}
      />
      <ReportRecords page={page} onPage={onPage} />
    </section>
  )
}
