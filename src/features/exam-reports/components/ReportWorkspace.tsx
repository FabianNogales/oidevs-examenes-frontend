import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
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
                Tipo de reporte
                <select
                  id={`${id}-type`}
                  disabled={report.busy}
                  value={filters.type}
                  onChange={(e) =>
                    change({ type: e.target.value as ReportKind })
                  }
                  aria-invalid={!!errors.type}
                  aria-describedby={
                    errors.type ? `${id}-type-error` : undefined
                  }
                >
                  {exam.permissions.report_types.map((t) => (
                    <option key={t} value={t}>
                      {REPORT_LABELS[t]}
                    </option>
                  ))}
                </select>
                {errors.type && (
                  <small id={`${id}-type-error`} className={styles.error}>
                    {errors.type}
                  </small>
                )}
              </label>
              <label htmlFor={`${id}-from`}>
                Desde
                <input
                  id={`${id}-from`}
                  type="date"
                  disabled={report.busy}
                  value={filters.date_from}
                  onChange={(e) => change({ date_from: e.target.value })}
                  aria-invalid={!!errors.date_from}
                  aria-describedby={
                    errors.date_from ? `${id}-from-error` : undefined
                  }
                />
                {errors.date_from && (
                  <small id={`${id}-from-error`} className={styles.error}>
                    {errors.date_from}
                  </small>
                )}
              </label>
              <label htmlFor={`${id}-to`}>
                Hasta
                <input
                  id={`${id}-to`}
                  type="date"
                  disabled={report.busy}
                  value={filters.date_to}
                  onChange={(e) => change({ date_to: e.target.value })}
                  aria-invalid={!!errors.date_to}
                  aria-describedby={
                    errors.date_to ? `${id}-to-error` : undefined
                  }
                />
                {errors.date_to && (
                  <small id={`${id}-to-error`} className={styles.error}>
                    {errors.date_to}
                  </small>
                )}
              </label>
            </div>
            <p>
              El intervalo se aplica a la fecha del examen para inscritos y
              pendientes, y a la fecha del registro para ingresos, incidencias e
              información disciplinaria.
            </p>
            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={report.busy}
              >
                {report.busy ? 'Generando reporte…' : 'Generar reporte'}
              </button>
            </div>
          </form>
        ) : (
          <p role="alert">
            No hay tipos de reporte autorizados para este examen.
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
            Puedes generar un reporte nuevo si el anterior venció o cambió tu
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
