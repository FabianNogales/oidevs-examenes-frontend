import type {
  ReportFilters,
  ReportKind,
  ReportFormat,
} from '../types/report.types'
export const REPORT_LABELS: Record<ReportKind, string> = {
  ENROLLED: 'Estudiantes inscritos',
  ATTENDANCE: 'Asistencia confirmada',
  PENDING_ABSENT: 'Pendientes o ausentes',
  INCIDENTS: 'Incidencias e ingresos irregulares',
  DISCIPLINARY: 'Infracciones y expulsiones',
}
export const isReportKind = (v: unknown): v is ReportKind =>
  typeof v === 'string' && Object.hasOwn(REPORT_LABELS, v)
export const isReportFormat = (v: unknown): v is ReportFormat =>
  v === 'pdf' || v === 'csv'
export function isDate(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  )
}
export function validateReportFilters(
  v: ReportFilters,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!isReportKind(v.type)) errors.type = 'Selecciona un tipo de reporte.'
  if (v.date_from !== '' && !isDate(v.date_from))
    errors.date_from = 'La fecha de inicio no es válida.'
  if (v.date_to !== '' && !isDate(v.date_to))
    errors.date_to = 'La fecha final no es válida.'
  if (v.date_from && v.date_to && v.date_to < v.date_from)
    errors.date_to = 'La fecha final debe ser igual o posterior a la inicial.'
  return errors
}
export const safeReportId = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v)
export function reportDay(v: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(v))
  return ['year', 'month', 'day']
    .map((key) => parts.find((p) => p.type === key)?.value)
    .join('-')
}
