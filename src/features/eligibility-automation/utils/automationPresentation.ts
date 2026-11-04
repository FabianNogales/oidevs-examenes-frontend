const CRITERION_LABELS: Readonly<Record<string, string>> = {
  PREVIOUS_ASSESSMENTS_TAKEN: 'Evaluaciones previas rendidas',
  MIN_ATTENDANCE_PERCENTAGE: 'Porcentaje mínimo de asistencia',
  MIN_ASSESSMENT_SCORE: 'Nota mínima por evaluación',
  MIN_ACCUMULATED_SCORE: 'Puntaje acumulado mínimo',
  MIN_ASSESSMENT_AVERAGE: 'Promedio mínimo de evaluaciones',
  SECOND_INSTANCE_PARTIAL_AVERAGE:
    'Promedio de parciales para segunda instancia',
}

export function criterionLabel(code: string, backendLabel?: string): string {
  return backendLabel?.trim() || CRITERION_LABELS[code] || code
}

export function parameterLabel(key: string): string {
  return (
    (
      {
        assessment_keys: 'Evaluaciones',
        assessment_key: 'Evaluación',
        minimum_percentage: 'Porcentaje mínimo de asistencia',
        minimum_score: 'Nota mínima',
        minimum_total: 'Puntaje acumulado mínimo',
        minimum_average: 'Promedio mínimo',
      } as Record<string, string>
    )[key] ?? key
  )
}

export function assessmentLabel(key: string, backendLabel?: string): string {
  return (
    backendLabel?.trim() ||
    (
      {
        FIRST_PARTIAL: 'Primer parcial',
        SECOND_PARTIAL: 'Segundo parcial',
      } as Record<string, string>
    )[key] ||
    key
  )
}

export function evaluationTypeLabel(value: string): string {
  return value === 'makeup' ? 'Segunda instancia' : value
}

export function combinationLabel(value: string): string {
  return value === 'ALL'
    ? 'Deben cumplirse todos los criterios seleccionados'
    : value
}

export function conditionLabel(operator?: string, threshold?: number): string {
  const text =
    (
      {
        GT: 'Mayor que',
        GTE: 'Mayor o igual que',
        LT: 'Menor que',
        LTE: 'Menor o igual que',
        EQ: 'Igual a',
        NE: 'Distinto de',
      } as Record<string, string>
    )[operator ?? ''] ??
    operator ??
    '—'
  return `${text} ${threshold ?? '—'}`
}

export function policyStatusLabel(value: string): string {
  return (
    ({ DRAFT: 'Borrador', ACTIVE: 'Activa' } as Record<string, string>)[
      value
    ] ?? value
  )
}

export function activationLabel(value: string | null): string {
  if (value === null) return 'No activada'
  if (Number.isNaN(Date.parse(value))) return value
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function academicLoadError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  if (/^The search field must be a string\./.test(error.message)) {
    return 'La búsqueda debe ser texto. Borra el campo e inténtalo nuevamente.'
  }
  return /^(The |SQLSTATE|Request failed|Network Error|Failed to fetch)/i.test(error.message)
    ? fallback
    : error.message
}

export function academicDiagnostic(error: unknown): string {
  const info = error as { status?: number | null; code?: string | null; fieldErrors?: Record<string, string> } | null
  // Only structural information: no query, response body, student data or credentials.
  return JSON.stringify({ status: info?.status ?? null, code: info?.code ?? null, fields: Object.keys(info?.fieldErrors ?? {}) })
}

export function evaluationDateLabel(value: string): string {
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return `${value} (zona horaria no indicada)`
  if (Number.isNaN(Date.parse(value))) return value
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz', dateStyle: 'medium', timeStyle: 'medium',
  }).format(new Date(value))
}

export function missingFieldLabel(field: string, assessmentLabels: Record<string, string> = {}): string {
  const match = /^assessments\.(FIRST_PARTIAL|SECOND_PARTIAL)(?:\.(was_taken|score))?$/.exec(field)
  if (match) {
    const label = assessmentLabel(match[1], assessmentLabels[match[1]])
    return `Datos del ${label.charAt(0).toLowerCase()}${label.slice(1)}${match[2] ? `: ${match[2] === 'score' ? 'nota' : 'si rindió la evaluación'}` : ''}`
  }
  return ({ attended_classes: 'Clases asistidas', total_classes: 'Total de clases' } as Record<string, string>)[field] ?? field
}

export function criterionErrorCode(field: string, criteria: { code: string }[]): string | null {
  const indexed = /^criteria\.(\d+)(?:\.|$)/.exec(field)
  if (indexed) return criteria[Number(indexed[1])]?.code ?? null
  return criteria.find(({ code }) => field === code || field.startsWith(`${code}.`) || field === `criteria.${code}` || field.startsWith(`criteria.${code}.`))?.code ?? null
}

export function academicActionLabel(action: string): string {
  return ({
    ACADEMIC_IMPORT_PREVIEWED: 'Vista previa de importación',
    ACADEMIC_IMPORT_CONFIRMED: 'Importación confirmada',
    ACADEMIC_RECORD_IMPORTED: 'Registro académico importado',
    ACADEMIC_RECORD_CORRECTED: 'Corrección de datos académicos',
  } as Record<string, string>)[action] ?? 'Actividad académica'
}

export type AcademicHistoryChange = {
  label: string
  oldValue: string
  newValue: string
}

const HISTORY_TECHNICAL_FIELDS = new Set(['id', 'student_id', 'assessment_key', 'created_at', 'updated_at', 'revision'])

function flattenHistoryValues(
  value: Record<string, unknown> | null,
  prefix = '',
  result: Record<string, unknown> = {},
): Record<string, unknown> {
  for (const [key, nested] of Object.entries(value ?? {})) {
    if (HISTORY_TECHNICAL_FIELDS.has(key)) continue
    const path = prefix ? `${prefix}.${key}` : key
    if (nested !== null && typeof nested === 'object' && !Array.isArray(nested)) {
      flattenHistoryValues(nested as Record<string, unknown>, path, result)
    } else {
      result[path] = nested
    }
  }
  return result
}

function historyValueLabel(value: unknown, key: string): string {
  if (value === null || value === undefined || value === '') return 'Sin dato'
  if (typeof value === 'boolean' && key === 'was_taken') return value ? 'Rindió' : 'No rindió'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function historyFieldLabel(path: string, fallbackAssessmentKey?: string): string {
  const parts = path.split('.')
  const field = parts.at(-1) ?? path
  const assessmentKey = parts[0] === 'assessments'
    ? parts[1]
    : fallbackAssessmentKey
  const assessment = assessmentKey ? assessmentLabel(assessmentKey) : ''
  const labels: Record<string, string> = {
    was_taken: 'Estado de evaluación',
    score: 'Nota',
    reason: 'Motivo',
    attended_classes: 'Clases asistidas',
    total_classes: 'Total de clases',
  }
  const label = labels[field] ?? field.replaceAll('_', ' ').replace(/^./, (letter) => letter.toLocaleUpperCase())
  return assessment ? `${assessment} · ${label}` : label
}

export function academicHistoryChanges(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): AcademicHistoryChange[] {
  const oldFields = flattenHistoryValues(oldValues)
  const newFields = flattenHistoryValues(newValues)
  const paths = new Set([...Object.keys(oldFields), ...Object.keys(newFields)])
  const changes: AcademicHistoryChange[] = []

  const attendanceChanged = paths.has('attended_classes') || paths.has('total_classes')
  if (attendanceChanged && (
    oldFields.attended_classes !== newFields.attended_classes
    || oldFields.total_classes !== newFields.total_classes
  )) {
    const attendance = (fields: Record<string, unknown>, fallback: Record<string, unknown>) => {
      const value = (key: string) => {
        const source = Object.hasOwn(fields, key) ? fields : fallback
        return Object.hasOwn(source, key) ? historyValueLabel(source[key], key) : '—'
      }
      return `${value('attended_classes')} / ${value('total_classes')}`
    }
    changes.push({
      label: 'Asistencia',
      oldValue: attendance(oldFields, newFields),
      newValue: attendance(newFields, oldFields),
    })
    paths.delete('attended_classes')
    paths.delete('total_classes')
  }

  for (const path of paths) {
    const oldValue = oldFields[path]
    const newValue = newFields[path]
    if (JSON.stringify(oldValue) === JSON.stringify(newValue) || path === 'reason') continue
    const parts = path.split('.')
    const field = parts.at(-1) ?? path
    const assessmentKey = [newValues?.assessment_key, oldValues?.assessment_key]
      .find((value): value is string => typeof value === 'string')
    changes.push({
      label: historyFieldLabel(path, assessmentKey),
      oldValue: historyValueLabel(oldValue, field),
      newValue: historyValueLabel(newValue, field),
    })
  }
  return changes
}

export function academicHistoryReason(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): string | null {
  const reason = newValues?.reason ?? oldValues?.reason
  return typeof reason === 'string' && reason.trim() ? reason : null
}
