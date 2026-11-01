import layoutStyles from './ExamSchedulerLayout.module.css'

export interface ExamSubjectBannerProps {
  subjectName: string
  subjectCode?: string | null
  academicTermName?: string | null
  isSelectionValid?: boolean
  showValidationPill?: boolean
}

export function ExamSubjectBanner({
  subjectName,
  subjectCode,
  academicTermName,
  isSelectionValid = false,
  showValidationPill = false,
}: ExamSubjectBannerProps) {
  return (
    <section
      className={layoutStyles.subjectBanner}
      aria-label="Materia y periodo del examen"
    >
      <div className={layoutStyles.subjectDetails}>
        <div className={layoutStyles.subjectTitleRow}>
          <h2>{subjectName}</h2>
          {subjectCode ? (
            <span className={layoutStyles.codePill}>Código {subjectCode}</span>
          ) : null}
        </div>
        <p className={layoutStyles.subjectTermText}>
          Periodo académico:{' '}
          <strong>{academicTermName || 'No informado'}</strong>
        </p>
      </div>

      {showValidationPill ? (
        <div className={layoutStyles.statusPill}>
          <span
            className={
              isSelectionValid
                ? layoutStyles.statusDotValid
                : layoutStyles.statusDotNeutral
            }
          />
          <span>
            {isSelectionValid
              ? 'Horario y aula verificados correctamente'
              : 'Selecciona fecha, hora y un aula disponible'}
          </span>
        </div>
      ) : null}
    </section>
  )
}