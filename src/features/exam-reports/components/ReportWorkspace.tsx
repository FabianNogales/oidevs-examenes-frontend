import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Dropdown } from '@/shared/components/ui/Dropdown'
import type {
  ReportExam,
  ReportFilters,
  ReportKind,
} from '../types/report.types'
import { REPORT_LABELS, validateReportFilters } from '../utils/reportValidation'
import { useExamReport } from '../hooks/useExamReport'
import { ReportResult } from './ReportResult'
import styles from '../pages/ExamReports.module.css'
export function ReportWorkspace({
  exam,
  onChangeExam,
}: {
  exam: ReportExam
  onChangeExam: () => void
}) {
  const id = useId(),
    form = useRef<HTMLFormElement>(null),
    [filters, setFilters] = useState<ReportFilters>({
      type: exam.permissions.report_types[0] ?? 'ENROLLED',
      date_from: '',
      date_to: '',
    }),
    [errors, setErrors] = useState<Record<string, string>>({}),
    report = useExamReport(exam)
  useEffect(() => {
    if (Object.keys(errors).length)
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])
  function change(patch: Partial<ReportFilters>) {
    setFilters((v) => ({ ...v, ...patch }))
    setErrors({})
    report.invalidate()
  }
  function submit(e: FormEvent) {
    e.preventDefault()
    const fields = validateReportFilters(filters)
    setErrors(fields)
    if (!Object.keys(fields).length) void report.generate(filters)
  }
  return (
    <>
      <section className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <h2>{exam.name}</h2>
            <p>
              {exam.subject.name} · {exam.subject.code} ·{' '}
              {exam.academic_term.name}
            </p>
          </div>
          <button type="button" onClick={onChangeExam}>
            Cambiar examen
          </button>
        </div>
        {exam.permissions.report_types.length ? (
          <form ref={form} onSubmit={submit} noValidate>
            <div className={styles.filters}>
              <label htmlFor={`${id}-type`}>
                Tipo de informe
                <Dropdown<ReportKind>
                  id={`${id}-type`}
                  disabled={report.busy}
                  value={filters.type}
                  invalid={Boolean(errors.type)}
                  aria-describedby={
                    errors.type ? `${id}-type-error` : undefined
                  }
                  options={exam.permissions.report_types.map((t) => ({
                    value: t,
                    label: REPORT_LABELS[t],
                  }))}
                  onChange={(nextType) => change({ type: nextType })}
                />
                {errors.type && (
                  <small id={`${id}-type-error`} className={styles.error}>
                    {errors.type}
                  </small>
                )}
              </label>
              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={report.busy}
                >
                  {report.busy ? 'Generando informe…' : 'Generar informe'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p role="alert">
            No hay tipos de informe autorizados para este examen.
          </p>
        )}
      </section>
      {report.error && (
        <div className={styles.panel} role="alert">
          <p className={styles.error}>{report.error}</p>
          <button
            type="button"
            onClick={() => void report.retry()}
            disabled={report.busy}
          >
            Reintentar consulta
          </button>
          <p>
            Puedes generar un informe nuevo si el anterior venció o cambió tu
            autorización.
          </p>
        </div>
      )}
      {report.busy && (
        <p role="status">Consultando los registros autorizados…</p>
      )}
      {report.data && (
        <ReportResult
          exam={exam}
          filters={filters}
          page={report.data}
          onPage={(page) => void report.changePage(page)}
        />
      )}
    </>
  )
}
