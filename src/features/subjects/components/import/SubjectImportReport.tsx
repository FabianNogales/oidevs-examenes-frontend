import type {
  SubjectImportPreview,
  SubjectImportConfirmation,
} from '../../types/subjectImport.types'
import { SubjectImportTable } from './SubjectImportTable'
import styles from '@/features/students/pages/ImportStudentsPage.module.css'
import local from '../../pages/ImportSubjectsPage.module.css'

export function SubjectImportReport({
  report,
  confirmed = false,
}: {
  report: SubjectImportPreview | SubjectImportConfirmation
  confirmed?: boolean
}) {
  const summary = report.summary
  const values =
    'imported' in summary
      ? [
          ['Total de filas', summary.total],
          ['Importadas', summary.imported],
          ['Con errores', summary.failed],
          ['Omitidas', summary.omitted],
        ]
      : [
          ['Total de filas', summary.total],
          ['Listas para importar', summary.valid],
          ['Con errores', summary.invalid],
          ['Omitidas', summary.omitted],
        ]
  return (
    <>
      <section
        className={styles.previewPanel}
        aria-label="Resumen de importación"
      >
        <h3>
          {confirmed
            ? 'Resumen final de importación'
            : 'Resumen de importación'}
        </h3>
        <div className={`${styles.previewSummary} ${local.summary}`}>
          {values.map(([label, value]) => (
            <div className={styles.summaryItem} key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <p className={local.summaryHelp}>
          Los totales cuentan filas de materia y carrera; una materia puede
          aparecer en varias filas.
        </p>
      </section>
      <SubjectImportTable
        key={confirmed ? 'confirmed' : 'preview'}
        rows={report.rows}
        confirmed={confirmed}
      />
    </>
  )
}
