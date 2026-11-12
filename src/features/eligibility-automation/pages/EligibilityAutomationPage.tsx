import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { parseExamId } from '@/features/exams/api/examDetailsApi'
import { useExamDetail } from '@/features/exams/hooks/useExamDetail'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import pageStyles from '@/features/exams/pages/TeacherExamsPage.module.css'
import {
  confirmEvaluationAndReloadHu12,
  correctAcademicRecord,
  EligibilityAutomationApiError,
  getAcademicHistory,
  getAllEvaluationResults,
  getAutomationConfiguration,
  getAutomationOptions,
  getEvaluationDetail,
  getEvaluationHistory,
  previewEligibilityEvaluation,
  saveAutomationConfiguration,
} from '../api/eligibilityAutomationApi'
import type {
  AcademicHistoryEntry,
  AcademicRecord,
  AcademicRecordPayload,
  ApiPage,
  AutomationConfiguration,
  AutomationCriterion,
  AutomationOptions,
  CatalogCriterion,
  EvaluationConfirmation,
  EvaluationHistoryEntry,
  EvaluationResult,
  EvaluationView,
  ImportSchema,
  SelectedCriterion,
} from '../types/eligibilityAutomation.types'
import styles from './EligibilityAutomation.module.css'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { useAcademicData } from '../hooks/useAcademicData'
import { AcademicCsvImportPanel } from '../components/AcademicCsvImportPanel'
import { getAcademicCsvLayout, getPersistedAcademicCriteria } from '../utils/academicCsv'
import {
  academicActionLabel,
  academicHistoryChanges,
  academicHistoryReason,
  assessmentLabel,
  combinationLabel,
  conditionLabel,
  criterionErrorCode,
  criterionLabel,
  evaluationDateLabel,
  evaluationTypeLabel,
  missingFieldLabel,
  parameterLabel,
} from '../utils/automationPresentation'

const titleId = 'eligibility-automation-title'

type Section = 'configuration' | 'academic' | 'evaluation' | 'history'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'configuration', label: 'Configurar criterios' },
  { id: 'academic', label: 'Datos académicos' },
  { id: 'evaluation', label: 'Vista previa' },
  { id: 'history', label: 'Historial' },
]

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function criteriaValidationMessage(
  criterion: AutomationCriterion,
  values: Record<string, unknown>,
): boolean {
  return Object.entries(criterion.parameters).every(([key, schema]) => {
    const value = values[key]
    if (schema.type === 'array') {
      return (
        (!schema.required && (value === undefined || value === '')) ||
        (Array.isArray(value) && value.length >= (schema.min_items ?? 0))
      )
    }
    if (schema.type === 'string') {
      return (
        (!schema.required && (value === undefined || value === '')) ||
        (typeof value === 'string' && value.length > 0)
      )
    }
    if (!schema.required && (value === undefined || value === '')) return true
    if (typeof value !== 'number' || !Number.isFinite(value)) return false
    if (schema.minimum !== undefined && value < schema.minimum) return false
    if (schema.maximum !== undefined && value > schema.maximum) return false
    if (
      schema.minimum_exclusive !== undefined &&
      value <= schema.minimum_exclusive
    )
      return false
    return true
  })
}

function displayStatus(status: string | null | undefined): string {
  if (status === 'ELIGIBLE') return 'Habilitado'
  if (status === 'INELIGIBLE') return 'Inhabilitado'
  if (status === 'PENDING') return 'Pendiente'
  return 'Sin decisión vigente'
}

function displayValue(
  value: unknown,
  assessmentLabels: Record<string, string> = {},
): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value))
    return value
      .map((item) =>
        typeof item === 'string'
          ? assessmentLabel(item, assessmentLabels[item])
          : String(item),
      )
      .join(' + ')
  if (typeof value === 'object') return 'Dato compuesto'
  return String(value)
}

function appliedParameterSummary(
  criterion: SelectedCriterion,
  assessmentLabels: Record<string, string>,
): string[] {
  const parameters = criterion.parameters
  const assessmentKeys = parameters.assessment_keys
  const values: string[] = []
  if (Array.isArray(assessmentKeys)) {
    values.push(
      `${parameterLabel('assessment_keys')}: ${displayValue(assessmentKeys, assessmentLabels)}`,
    )
  } else if (typeof parameters.assessment_key === 'string') {
    values.push(
      `${parameterLabel('assessment_key')}: ${assessmentLabel(
        parameters.assessment_key,
        assessmentLabels[parameters.assessment_key],
      )}`,
    )
  }
  for (const [key, value] of Object.entries(parameters)) {
    if (
      ['assessment_keys', 'assessment_key', 'operator', 'threshold'].includes(
        key,
      )
    )
      continue
    values.push(
      `${parameterLabel(key)}: ${displayValue(value, assessmentLabels)}`,
    )
  }
  if (
    typeof parameters.operator === 'string' &&
    typeof parameters.threshold === 'number'
  ) {
    values.push(
      `Promedio requerido: ${conditionLabel(parameters.operator, parameters.threshold)}`,
    )
  }
  return values
}

function isPage<T>(value: ApiPage<T> | null): value is ApiPage<T> {
  return value !== null
}

function academicScore(record: AcademicRecord, key: string): string {
  const assessment = record.assessments?.[key]
  if (!assessment?.was_taken || assessment.score === null) return 'No rendido'
  return String(assessment.score)
}

function academicAttendancePercentage(record: AcademicRecord): string {
  const attended = record.attended_classes
  const total = record.total_classes
  if (attended === null || total === null || total <= 0) return '—'
  return `${Number(((attended / total) * 100).toFixed(2))} %`
}

function academicAverage(record: AcademicRecord): string {
  const pp = record.assessments?.FIRST_PARTIAL
  const sp = record.assessments?.SECOND_PARTIAL
  if (
    !pp?.was_taken ||
    !sp?.was_taken ||
    pp.score === null ||
    sp.score === null
  ) {
    return 'Pendiente'
  }
  return String(Number(((pp.score + sp.score) / 2).toFixed(2)))
}

function CriterionParameter({
  criterion,
  name,
  value,
  assessmentLabels,
  onChange,
}: {
  criterion: AutomationCriterion
  name: string
  value: unknown
  assessmentLabels: Record<string, string>
  onChange: (value: unknown) => void
}) {
  const schema = criterion.parameters[name]
  const id = `criterion-${criterion.code}-${name}`
  const label = parameterLabel(name)
  if (schema.type === 'array') {
    const selected = Array.isArray(value) ? value.map(String) : []
    return (
      <fieldset
        className={`${styles.parameter} ${styles.assessmentOptions}`}
        aria-describedby={`${id}-hint`}
      >
        <legend>{label}</legend>
        {(schema.options ?? []).map((option) => (
          <label className={styles.criterionHeading} key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) =>
                onChange(
                  event.currentTarget.checked
                    ? [...selected, option]
                    : selected.filter((item) => item !== option),
                )
              }
            />
            <span>{assessmentLabel(option, assessmentLabels[option])}</span>
          </label>
        ))}
        <small id={`${id}-hint`}>
          Marca las evaluaciones que deseas incluir.
          {schema.min_items ? ` Selecciona al menos ${schema.min_items}.` : ''}
        </small>
      </fieldset>
    )
  }
  if (schema.type === 'string') {
    return (
      <div className={styles.parameter}>
        <label htmlFor={id}>{label}</label>
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.currentTarget.value)}
        >
          <option value="">Selecciona una opción</option>
          {(schema.options ?? []).map((option) => (
            <option key={option} value={option}>
              {assessmentLabel(option, assessmentLabels[option])}
            </option>
          ))}
        </select>
      </div>
    )
  }
  return (
    <div className={styles.parameter}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        step="0.01"
        min={schema.minimum ?? schema.minimum_exclusive}
        max={schema.maximum}
        value={typeof value === 'number' ? value : ''}
        onChange={(event) =>
          onChange(
            event.currentTarget.value === ''
              ? ''
              : Number(event.currentTarget.value),
          )
        }
      />
      {schema.minimum_exclusive !== undefined ||
      schema.minimum !== undefined ||
      schema.maximum !== undefined ? (
        <small>
          {schema.minimum_exclusive !== undefined
            ? `Mayor que ${schema.minimum_exclusive}`
            : schema.minimum !== undefined
              ? `Mínimo ${schema.minimum}`
              : ''}
          {schema.maximum !== undefined ? `; máximo ${schema.maximum}` : ''}
        </small>
      ) : null}
    </div>
  )
}

function CriterionEditor({
  criterion,
  selected,
  onToggle,
  onParameterChange,
  assessmentLabels,
  fieldErrors = [],
}: {
  criterion: AutomationCriterion
  selected: SelectedCriterion | undefined
  onToggle: (criterion: AutomationCriterion, enabled: boolean) => void
  onParameterChange: (code: string, key: string, value: unknown) => void
  assessmentLabels: Record<string, string>
  fieldErrors?: { field: string; message: string }[]
}) {
  const locked = criterion.required === true || criterion.locked === true
  return (
    <article
      className={`${styles.criterion} ${locked ? styles.requiredCriterion : ''}`}
      aria-describedby={
        fieldErrors.length ? `errors-${criterion.code}` : undefined
      }
    >
      <label className={styles.criterionHeading}>
        <input
          type="checkbox"
          checked={locked || selected !== undefined}
          disabled={locked}
          onChange={(event) => onToggle(criterion, event.currentTarget.checked)}
        />
        <span>
          <strong>{criterionLabel(criterion.code, criterion.label)}</strong>
          {locked ? (
            <small className={styles.criterionBadges}>
              {criterion.required ? (
                <span className={styles.badge}>Obligatorio</span>
              ) : null}
              <span className={styles.badge}>Bloqueado</span>
            </small>
          ) : null}
        </span>
      </label>
      {criterion.operator !== undefined || criterion.threshold !== undefined ? (
        <p className={styles.note}>
          Condición institucional:{' '}
          {conditionLabel(criterion.operator, criterion.threshold)}
        </p>
      ) : null}
      {selected && !locked ? (
        <div className={styles.parameters}>
          {Object.keys(criterion.parameters).map((key) => (
            <CriterionParameter
              key={key}
              criterion={criterion}
              name={key}
              value={selected.parameters[key]}
              assessmentLabels={assessmentLabels}
              onChange={(value) =>
                onParameterChange(criterion.code, key, value)
              }
            />
          ))}
        </div>
      ) : null}
      {fieldErrors.length ? (
        <div id={`errors-${criterion.code}`} role="alert">
          {fieldErrors.map(({ field, message }) => (
            <p className={styles.fieldError} key={field}>
              {message}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function CorrectionForm({
  record,
  schema,
  layout,
  onCancel,
  onSave,
  onReload,
}: {
  record: AcademicRecord
  schema: ImportSchema
  layout: ReturnType<typeof getAcademicCsvLayout>
  onCancel: () => void
  onSave: (payload: AcademicRecordPayload) => Promise<void>
  onReload: () => void
}) {
  const [values, setValues] = useState<AcademicRecordPayload>(() => ({
    revision: record.revision,
    reason: '',
    assessments: Object.fromEntries(
      Object.entries(record.assessments ?? {}).map(([key, value]) => [
        key,
        { was_taken: value.was_taken, score: value.score ?? null },
      ]),
    ),
    attended_classes: record.attended_classes,
    total_classes: record.total_classes,
  }))
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [conflict, setConflict] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})
    setConflict(false)
    try {
      await onSave(values)
    } catch (cause) {
      const apiError =
        cause instanceof EligibilityAutomationApiError ? cause : null
      setError(getErrorMessage(cause, 'No se pudo guardar la corrección.'))
      if (apiError) {
        setFieldErrors(apiError.fieldErrors)
        setConflict(apiError.status === 409)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className={styles.correction}
      onSubmit={(event) => void submit(event)}
    >
      <h3>Corrección explícita del registro</h3>
      <p>
        {record.first_names} {record.last_names} · SIS {record.sis_code} ·
        revisión {record.revision}
      </p>
      {layout.fields.map(({ key, label, scored }) => {
        const assessment = values.assessments[key]
        return (
          <fieldset className={styles.assessmentFields} key={key}>
            <legend>{label}</legend>
            <label>
              Estado de la evaluación
              <select
                disabled={!scored && assessment?.score != null}
                value={
                  assessment
                    ? assessment.was_taken
                      ? 'taken'
                      : 'not_taken'
                    : ''
                }
                onChange={(event) => {
                  const status = event.currentTarget.value
                  setValues((current) => {
                    const nextAssessments = { ...current.assessments }
                    if (!status) {
                      delete nextAssessments[key]
                    } else {
                      nextAssessments[key] = {
                        was_taken: status === 'taken',
                        score:
                          status === 'taken'
                            ? (nextAssessments[key]?.score ?? null)
                            : null,
                      }
                    }
                    return { ...current, assessments: nextAssessments }
                  })
                }}
              >
                <option value="">Sin dato</option>
                <option value="taken">Rindió</option>
                <option value="not_taken">No rindió</option>
              </select>
            </label>
            {!scored && assessment?.score != null ? <p>El estado se conserva porque esta evaluación tiene una nota oculta registrada.</p> : null}
            {scored ? <label>
              Nota
              <input
                type="number"
                min={schema.score_min}
                max={schema.score_max}
                step="0.01"
                disabled={!assessment?.was_taken}
                value={assessment?.score ?? ''}
                onChange={(event) => {
                  const value = event.currentTarget.value
                  setValues((current) => ({
                    ...current,
                    assessments: {
                      ...current.assessments,
                      [key]: {
                        ...(current.assessments[key] ?? {
                          was_taken: true,
                          score: null,
                        }),
                        score: value === '' ? null : Number(value),
                      },
                    },
                  }))
                }}
              />
            </label> : null}
          </fieldset>
        )
      })}
      {layout.includesAttendance ? <div className={styles.formGrid}>
        <label>
          Clases asistidas
          <input
            type="number"
            min="0"
            value={values.attended_classes ?? ''}
            onChange={(event) => {
              const value = event.currentTarget.value
              setValues((current) => ({
                ...current,
                attended_classes: value === '' ? null : Number(value),
              }))
            }}
          />
        </label>
        <label>
          Total de clases
          <input
            type="number"
            min="1"
            value={values.total_classes ?? ''}
            onChange={(event) => {
              const value = event.currentTarget.value
              setValues((current) => ({
                ...current,
                total_classes: value === '' ? null : Number(value),
              }))
            }}
          />
        </label>
      </div> : null}
      <label>
        Motivo obligatorio
        <textarea
          required
          maxLength={500}
          value={values.reason}
          onChange={(event) => {
            const value = event.currentTarget.value
            setValues((current) => ({ ...current, reason: value }))
          }}
        />
      </label>
      {Object.entries(fieldErrors).map(([field, message]) => (
        <p className={styles.fieldError} key={field}>
          {field}: {message}
        </p>
      ))}
      {error ? (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          {conflict ? (
            <button
              type="button"
              className={sharedStyles.secondaryButton}
              onClick={onReload}
            >
              Recargar registros sin perder esta corrección
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={styles.actions}>
        <button
          type="button"
          className={sharedStyles.secondaryButton}
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={sharedStyles.primaryButton}
          disabled={
            saving ||
            Object.keys(values.assessments).length === 0 ||
            !values.reason.trim()
          }
        >
          {saving ? 'Guardando…' : 'Guardar corrección'}
        </button>
      </div>
    </form>
  )
}

function AppliedCriteriaList({
  title,
  configuration,
  catalog,
  assessmentLabels,
}: {
  title: string
  configuration: AutomationConfiguration
  catalog: CatalogCriterion[] | null
  assessmentLabels: Record<string, string>
}) {
  const names = Object.fromEntries(
    (catalog ?? []).map((criterion) => [criterion.code, criterion.name]),
  )
  const criteria = Array.isArray(configuration.criteria)
    ? configuration.criteria
    : [...configuration.selected_criteria, ...configuration.mandatory_criteria]

  return (
    <section className={styles.appliedCriteria}>
      <h3>{title}</h3>
      {criteria.length ? (
        <ul>
          {criteria.map((criterion, index) => (
            <li key={`${criterion.code}-${index}`}>
              <strong>
                {criterionLabel(
                  criterion.code,
                  criterion.name ?? names[criterion.code],
                )}
              </strong>
              <span>
                {appliedParameterSummary(criterion, assessmentLabels).join(
                  ' · ',
                ) || 'Parámetros definidos institucionalmente'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          No existen criterios automáticos aplicables para determinar una
          habilitación.
        </p>
      )}
    </section>
  )
}

function ResultRow({
  result,
  criterionLabels = {},
  assessmentLabels = {},
}: {
  result: EvaluationResult
  criterionLabels?: Record<string, string>
  assessmentLabels?: Record<string, string>
}) {
  return (
    <article className={styles.resultCard}>
      <div className={styles.resultHeading}>
        <div>
          <strong>{result.student.display_name}</strong>
          <span>SIS {result.student.sis}</span>
        </div>
        <span
          className={`${styles.status} ${result.manual_override_preserved ? styles.manual : ''}`}
        >
          {result.manual_override_preserved
            ? `Decisión vigente: ${displayStatus(result.effective_status)}`
            : displayStatus(result.computed_status)}
        </span>
      </div>
      {result.manual_override_preserved ? (
        <p className={styles.manualNotice}>
          Se conserva la decisión manual vigente.
        </p>
      ) : null}
      <dl className={styles.resultDetails}>
        <div>
          <dt>Resultado calculado</dt>
          <dd>{displayStatus(result.computed_status)}</dd>
        </div>
        <div>
          <dt>Estado actual</dt>
          <dd>{displayStatus(result.current_status)}</dd>
        </div>
        <div>
          <dt>Estado efectivo</dt>
          <dd>{displayStatus(result.effective_status)}</dd>
        </div>
        <div>
          <dt>Se actualizará</dt>
          <dd>{result.will_update ? 'Sí' : 'No'}</dd>
        </div>
      </dl>
      <p className={styles.reasonText}>{result.reason || '—'}</p>
      {result.missing_fields.length > 0 ? (
        <p className={styles.note}>
          Información faltante:{' '}
          {result.missing_fields
            .map((field) => missingFieldLabel(field, assessmentLabels))
            .join(', ')}
        </p>
      ) : null}
      {result.criteria_results.length > 0 ? (
        <details>
          <summary>Resultados por criterio</summary>
          <ul className={styles.criteriaResults}>
            {result.criteria_results.map((item, index) => (
              <li key={`${item.code}-${index}`}>
                <strong>
                  {criterionLabel(
                    item.code,
                    item.name ?? criterionLabels[item.code],
                  )}
                </strong>
                <span>
                  Resultado:{' '}
                  {item.status === 'PASSED'
                    ? 'Cumple'
                    : item.status === 'FAILED'
                      ? 'No cumple'
                      : 'Pendiente'}
                </span>
                {'actual_value' in item ? (
                  <span>
                    {item.code === 'MIN_ATTENDANCE_PERCENTAGE'
                      ? 'Asistencia'
                      : 'Valor actual'}
                    : {displayValue(item.actual_value, assessmentLabels)}
                  </span>
                ) : null}
                {'required_value' in item ? (
                  <span>
                    Requerido:{' '}
                    {displayValue(item.required_value, assessmentLabels)}
                  </span>
                ) : null}
                {item.reason ? <span>{item.reason}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  )
}

export function EligibilityAutomationPage() {
  const { examId: rawExamId } = useParams()
  const examId = parseExamId(rawExamId)
  const { search } = useLocation()
  const examState = useExamDetail(rawExamId)
  const { notify } = useAuth()
  const [section, setSection] = useState<Section>('configuration')
  const [options, setOptions] = useState<AutomationOptions | null>(null)
  const [configuration, setConfiguration] =
    useState<AutomationConfiguration | null>(null)
  const [manualReviewConditions, setManualReviewConditions] = useState('')
  const [selectedCriteria, setSelectedCriteria] = useState<SelectedCriterion[]>(
    [],
  )
  const [initialLoading, setInitialLoading] = useState(true)
  const [initialError, setInitialError] = useState('')
  const [configurationError, setConfigurationError] = useState('')
  const [configurationFieldErrors, setConfigurationFieldErrors] = useState<
    Record<string, string>
  >({})
  const [configurationErrorCodes, setConfigurationErrorCodes] = useState<
    Record<string, string | null>
  >({})
  const [configurationConflict, setConfigurationConflict] = useState(false)
  const [configurationSaved, setConfigurationSaved] = useState(false)
  const [savingConfiguration, setSavingConfiguration] = useState(false)
  const [recordSearch, setRecordSearch] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<AcademicRecord | null>(
    null,
  )
  const [evaluation, setEvaluation] = useState<EvaluationView | null>(null)
  const [evaluationError, setEvaluationError] = useState('')
  const [evaluationWorking, setEvaluationWorking] = useState(false)
  const [evaluationMustRefresh, setEvaluationMustRefresh] = useState(false)
  const [confirmation, setConfirmation] =
    useState<EvaluationConfirmation | null>(null)
  const [hu12Counts, setHu12Counts] = useState<{
    eligible: number
    ineligible: number
  } | null>(null)
  const [academicHistory, setAcademicHistory] =
    useState<ApiPage<AcademicHistoryEntry> | null>(null)
  const [evaluationHistory, setEvaluationHistory] =
    useState<ApiPage<EvaluationHistoryEntry> | null>(null)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyError, setHistoryError] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyDetail, setHistoryDetail] = useState<EvaluationView | null>(
    null,
  )
  const offeringId = examState.detail?.course_offering_id
  const {
    schema,
    schemaError,
    schemaLoading,
    records,
    recordsError,
    recordsLoading,
    schemaDiagnostic,
    recordsDiagnostic,
    loadSchema,
    loadRecords,
  } = useAcademicData(offeringId, section === 'academic')
  const csvLayout = schema && configuration
    ? getAcademicCsvLayout(
        getPersistedAcademicCriteria(configuration),
        schema,
        options?.assessments,
      )
    : null

  const configurationDirty = configuration !== null && (
    JSON.stringify(selectedCriteria) !== JSON.stringify(configuration.selected_criteria.filter((item) => !item.required && !item.locked)) ||
    manualReviewConditions !== (configuration.manual_review_conditions ?? '')
  )

  const loadConfiguration = useCallback(async () => {
    if (examId === null) return
    const [available, current] = await Promise.all([
      getAutomationOptions(examId),
      getAutomationConfiguration(examId),
    ])
    setOptions(available)
    setConfiguration(current)
    setManualReviewConditions(current.manual_review_conditions ?? '')
    setSelectedCriteria(
      current.selected_criteria.filter(
        (item) => !item.required && !item.locked,
      ),
    )
  }, [examId])

  useEffect(() => {
    let active = true
    if (examId === null) return
    void Promise.resolve()
      .then(() => {
        if (active) setInitialLoading(true)
        return Promise.all([
          getAutomationOptions(examId),
          getAutomationConfiguration(examId),
        ])
      })
      .then(([available, current]) => {
        if (!active) return
        setOptions(available)
        setConfiguration(current)
        setManualReviewConditions(current.manual_review_conditions ?? '')
        setSelectedCriteria(
          current.selected_criteria.filter(
            (item) => !item.required && !item.locked,
          ),
        )
        setInitialError('')
      })
      .catch((error: unknown) => {
        if (active)
          setInitialError(
            getErrorMessage(
              error,
              'No se pudo cargar el catálogo y la configuración.',
            ),
          )
      })
      .finally(() => {
        if (active) setInitialLoading(false)
      })
    return () => {
      active = false
    }
  }, [examId])

  useEffect(() => {
    if (section !== 'history' || !offeringId || examId === null) return
    let active = true
    void Promise.resolve()
      .then(() => {
        if (active) setHistoryLoading(true)
        return Promise.all([
          getAcademicHistory(offeringId, historyPage),
          getEvaluationHistory(examId, historyPage),
        ])
      })
      .then(([academic, evaluations]) => {
        if (!active) return
        setAcademicHistory(academic)
        setEvaluationHistory(evaluations)
        setHistoryError('')
      })
      .catch((error: unknown) => {
        if (active)
          setHistoryError(
            getErrorMessage(error, 'No se pudo consultar el historial.'),
          )
      })
      .finally(() => {
        if (active) setHistoryLoading(false)
      })
    return () => {
      active = false
    }
  }, [section, offeringId, examId, historyPage])

  const optionalCriteria = useMemo(
    () =>
      (options?.criteria ?? []).filter(
        (criterion) => !criterion.required && !criterion.locked,
      ),
    [options],
  )
  const criteriaAreValid = selectedCriteria.every((selected) => {
    const criterion = optionalCriteria.find(
      (item) => item.code === selected.code,
    )
    return (
      criterion !== undefined &&
      criteriaValidationMessage(criterion, selected.parameters)
    )
  })
  const unavailableSelectedCriteria = selectedCriteria.filter(
    (selected) =>
      !optionalCriteria.some((criterion) => criterion.code === selected.code),
  )

  function toggleCriterion(criterion: AutomationCriterion, enabled: boolean) {
    setConfigurationSaved(false)
    setEvaluation(null)
    setEvaluationMustRefresh(false)
    setSelectedCriteria((current) => {
      if (enabled) {
        if (current.some((item) => item.code === criterion.code)) return current
        const parameters = Object.fromEntries(
          Object.entries(criterion.parameters).map(([key, schema]) => [
            key,
            schema.type === 'array' ? [] : schema.type === 'number' ? '' : '',
          ]),
        )
        return [
          ...current,
          { code: criterion.code, parameters, required: false, locked: false },
        ]
      }
      return current.filter((item) => item.code !== criterion.code)
    })
  }

  function changeCriterionParameter(code: string, key: string, value: unknown) {
    setConfigurationSaved(false)
    setEvaluation(null)
    setEvaluationMustRefresh(false)
    setSelectedCriteria((current) =>
      current.map((item) =>
        item.code === code
          ? { ...item, parameters: { ...item.parameters, [key]: value } }
          : item,
      ),
    )
  }

  async function saveConfiguration() {
    if (examId === null || configuration === null) return
    setSavingConfiguration(true)
    setConfigurationError('')
    setConfigurationFieldErrors({})
    setConfigurationErrorCodes({})
    setConfigurationConflict(false)
    setConfigurationSaved(false)
    try {
      const criteria = selectedCriteria.map((item) => {
        const metadata = optionalCriteria.find(
          (criterion) => criterion.code === item.code,
        )
        const parameters = Object.fromEntries(
          Object.entries(item.parameters).map(([key, value]) => [
            key,
            metadata?.parameters[key]?.type === 'number' && value !== ''
              ? Number(value)
              : value,
          ]),
        )
        return { code: item.code, parameters }
      })
      const updated = await saveAutomationConfiguration(examId, {
        revision: configuration.revision,
        catalog_revision: configuration.catalog_revision,
        criteria,
        manual_review_conditions: manualReviewConditions.trim() || null,
      })
      setConfiguration(updated)
      setManualReviewConditions(updated.manual_review_conditions ?? '')
      setSelectedCriteria(
        updated.selected_criteria.filter(
          (item) => !item.required && !item.locked,
        ),
      )
      setConfigurationSaved(true)
      notify(
        'success',
        'La configuración de evaluación automática fue guardada.',
      )
    } catch (error) {
      const apiError =
        error instanceof EligibilityAutomationApiError ? error : null
      setConfigurationError(
        getErrorMessage(error, 'No se pudo guardar la configuración.'),
      )
      if (apiError) {
        setConfigurationFieldErrors(apiError.fieldErrors)
        setConfigurationErrorCodes(
          Object.fromEntries(
            Object.keys(apiError.fieldErrors).map((field) => [
              field,
              criterionErrorCode(field, selectedCriteria),
            ]),
          ),
        )
        setConfigurationConflict(apiError.status === 409)
      }
    } finally {
      setSavingConfiguration(false)
    }
  }

  async function reloadConfiguration(preservePreview = false) {
    setInitialLoading(true)
    setInitialError('')
    setConfigurationError('')
    setConfigurationConflict(false)
    if (!preservePreview) {
      setEvaluation(null)
      setEvaluationMustRefresh(false)
    }
    try {
      await loadConfiguration()
    } catch (error) {
      setInitialError(
        getErrorMessage(error, 'No se pudo recargar la configuración.'),
      )
    } finally {
      setInitialLoading(false)
    }
  }

  async function saveCorrection(
    record: AcademicRecord,
    payload: AcademicRecordPayload,
  ) {
    if (!offeringId) return
    await correctAcademicRecord(offeringId, record.id, payload)
    setSelectedRecord(null)
    notify(
      'success',
      'El registro académico fue corregido. La habilitación requiere una nueva evaluación explícita.',
    )
    await loadRecords()
  }

  async function createEvaluationPreview() {
    if (examId === null || configuration === null) return
    setEvaluationWorking(true)
    setEvaluationError('')
    setEvaluationMustRefresh(false)
    setConfirmation(null)
    setHu12Counts(null)
    try {
      const firstPage = await previewEligibilityEvaluation(
        examId,
        configuration.revision,
        configuration.catalog_revision,
      )
      setEvaluation(await getAllEvaluationResults(examId, firstPage))
    } catch (error) {
      const apiError =
        error instanceof EligibilityAutomationApiError ? error : null
      setEvaluationError(
        apiError?.status === 409
          ? 'La información cambió. Recarga los datos y genera una nueva vista previa.'
          : apiError?.code === 'CRITERIA_CONFLICT'
            ? apiError.message ||
              'La combinación de criterios seleccionada es incompatible.'
            : getErrorMessage(error, 'No se pudo generar la vista previa.'),
      )
      if (apiError?.status === 409) {
        setEvaluation(null)
        await reloadConfiguration()
        setEvaluationMustRefresh(true)
      }
    } finally {
      setEvaluationWorking(false)
    }
  }

  async function confirmEvaluation() {
    if (!evaluation || examId === null || evaluationMustRefresh) return
    setEvaluationWorking(true)
    setEvaluationError('')
    try {
      const {
        confirmation: result,
        eligibilities: current,
        refreshError,
      } = await confirmEvaluationAndReloadHu12(examId, evaluation.preview_id)
      setConfirmation(result)
      setEvaluation(null)
      if (current) {
        setHu12Counts(
          current.reduce(
            (counts, item) => {
              if (item.status === 'ELIGIBLE') counts.eligible += 1
              if (item.status === 'INELIGIBLE') counts.ineligible += 1
              return counts
            },
            { eligible: 0, ineligible: 0 },
          ),
        )
        notify(
          'success',
          result.updated === 0
            ? 'Proceso confirmado. No se modificaron habilitaciones.'
            : 'El proceso de habilitación fue confirmado.',
        )
      } else {
        const detail = getErrorMessage(refreshError, 'Error no especificado.')
        setEvaluationError(
          `El proceso fue confirmado, pero no se pudo actualizar la consulta de habilitaciones (${detail}). Vuelve a Habilitaciones para consultar los estados vigentes.`,
        )
        notify(
          'info',
          'El proceso se confirmó; vuelve a consultar las habilitaciones vigentes.',
        )
      }
    } catch (error) {
      const apiError =
        error instanceof EligibilityAutomationApiError ? error : null
      setEvaluationError(
        apiError?.status === 409
          ? 'La información cambió. Recarga los datos y genera una nueva vista previa.'
          : getErrorMessage(error, 'No se pudo confirmar la evaluación.'),
      )
      if (apiError?.status === 409) {
        setEvaluationMustRefresh(true)
        await reloadConfiguration(true)
      }
    } finally {
      setEvaluationWorking(false)
    }
  }

  async function openEvaluationHistory(entry: EvaluationHistoryEntry) {
    setHistoryError('')
    setHistoryDetail(null)
    try {
      const firstPage = await getEvaluationDetail(entry.exam_id, entry.id)
      setHistoryDetail(await getAllEvaluationResults(entry.exam_id, firstPage))
    } catch (error) {
      setHistoryError(
        getErrorMessage(error, 'No se pudo consultar el detalle histórico.'),
      )
    }
  }

  const eligibilitySummary = evaluation
    ? {
        updates: evaluation.results.data.filter((item) => item.will_update)
          .length,
        unchanged: evaluation.results.data.filter((item) => !item.will_update)
          .length,
        manual: evaluation.results.data.filter(
          (item) => item.manual_override_preserved,
        ).length,
        pending: evaluation.results.data.filter(
          (item) => item.computed_status === 'PENDING',
        ).length,
      }
    : null
  const assessmentLabels = Object.fromEntries(
    (options?.assessments ?? []).map((assessment) => [
      assessment.key,
      assessment.label,
    ]),
  )
  const criterionLabels = Object.fromEntries([
    ...(options?.criteria ?? []).map((criterion) => [
      criterion.code,
      criterion.label ?? criterion.name ?? criterionLabel(criterion.code),
    ]),
    ...(evaluation?.catalog ?? []).map((criterion) => [
      criterion.code,
      criterion.name,
    ]),
  ])

  if (examId === null) {
    return (
      <main>
        <PageContainer labelledBy={titleId}>
          <PageHeader title="Habilitación automática" titleId={titleId} />
          <section
            className={`${pageStyles.content} ${pageStyles.contentFull}`}
          >
            <p role="alert">El identificador del examen no es válido.</p>
          </section>
        </PageContainer>
      </main>
    )
  }

  return (
    <main>
      <PageContainer labelledBy={titleId}>
        <PageHeader
          title="Habilitación automática"
          titleId={titleId}
          description={
            <>
              {examState.exam?.name ?? `Examen #${examId}`}: configura los
              criterios, revisa los datos académicos y confirma los resultados.
            </>
          }
          breadcrumbs={[
            { label: 'Mis exámenes', to: `/teacher/exams${search}` },
            {
              label: 'Habilitaciones',
              to: `/teacher/exams/${examId}/eligibilities${search}`,
            },
            { label: 'Habilitación automática' },
          ]}
          actions={
            <Link to={`/teacher/exams/${examId}/eligibilities${search}`}>
              Volver a Habilitaciones
            </Link>
          }
        />
        <section className={`${pageStyles.content} ${pageStyles.contentFull}`}>
          {examState.isLoading ? <p role="status">Cargando examen…</p> : null}
          {examState.errorMessage ? (
            <p role="alert" className={styles.error}>
              {examState.errorMessage}
            </p>
          ) : null}
          {!offeringId && !examState.isLoading ? (
            <p role="alert" className={styles.error}>
              No se pudo identificar la oferta académica del examen. Recarga la
              página para consultar sus registros.
            </p>
          ) : null}
          <nav
            className={styles.sectionNav}
            aria-label="Secciones de habilitación automática"
          >
            {SECTIONS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={section === item.id ? styles.activeSection : ''}
                aria-current={section === item.id ? 'step' : undefined}
                onClick={() => setSection(item.id)}
              >
                <span>{index + 1}</span>
                {item.label}
              </button>
            ))}
          </nav>
          {initialLoading ? (
            <p role="status">Cargando catálogo y configuración…</p>
          ) : null}
          {initialError ? (
            <div role="alert" className={styles.error}>
              <p>{initialError}</p>
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                onClick={() => void reloadConfiguration()}
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {section === 'configuration' && options && configuration ? (
            <section aria-labelledby="configuration-title">
              <h2 id="configuration-title">Configuración</h2>
              <dl className={styles.configurationMetadata}>
                <div>
                  <dt>Tipo de evaluación</dt>
                  <dd>{evaluationTypeLabel(configuration.evaluation_type)}</dd>
                </div>
                <div>
                  <dt>Revisión de configuración</dt>
                  <dd>{configuration.revision}</dd>
                </div>
                <div>
                  <dt>Combinación</dt>
                  <dd>{combinationLabel(configuration.combination)}</dd>
                </div>
              </dl>
              <p className={styles.note}>
                Selecciona los criterios opcionales que deseas aplicar. Los
                requisitos institucionales obligatorios siempre se mantienen
                activos.
              </p>
              {unavailableSelectedCriteria.length > 0 ? (
                <p role="alert" className={styles.error}>
                  El servidor reportó criterios configurados que no están
                  disponibles en el catálogo actual. No se enviará una
                  configuración incompleta.
                </p>
              ) : null}
              <h3>Criterios obligatorios</h3>
              <div className={styles.requiredCriteria}>
                {options.criteria
                  .filter((criterion) => criterion.required || criterion.locked)
                  .map((criterion) => (
                    <CriterionEditor
                      key={criterion.code}
                      criterion={criterion}
                      selected={configuration.mandatory_criteria.find(
                        (item) => item.code === criterion.code,
                      )}
                      onToggle={() => undefined}
                      onParameterChange={() => undefined}
                      assessmentLabels={Object.fromEntries(
                        options.assessments.map((item) => [
                          item.key,
                          item.label,
                        ]),
                      )}
                    />
                  ))}
              </div>
              <h3>Criterios opcionales</h3>
              {optionalCriteria.length === 0 ? (
                <p>
                  No hay criterios opcionales disponibles para esta
                  configuración.
                </p>
              ) : null}
              <div
                className={`${styles.criterionList} ${styles.optionalCriteria}`}
              >
                {optionalCriteria.map((criterion) => (
                  <CriterionEditor
                    key={criterion.code}
                    criterion={criterion}
                    selected={selectedCriteria.find(
                      (item) => item.code === criterion.code,
                    )}
                    onToggle={toggleCriterion}
                    onParameterChange={changeCriterionParameter}
                    assessmentLabels={Object.fromEntries(
                      options.assessments.map((item) => [item.key, item.label]),
                    )}
                    fieldErrors={Object.entries(configurationFieldErrors)
                      .filter(
                        ([field]) =>
                          configurationErrorCodes[field] === criterion.code,
                      )
                      .map(([field, message]) => ({ field, message }))}
                  />
                ))}
              </div>
              {configuration.inactive_criteria.length > 0 ? (
                <section className={styles.inactiveCriteria}>
                  <h3>Criterios actualmente inactivos</h3>
                  <ul>
                    {configuration.inactive_criteria.map((criterion) => (
                      <li key={criterion.code}>
                        <strong>
                          {criterionLabel(criterion.code, criterion.name)}
                        </strong>
                        <p>
                          Este criterio estaba configurado previamente, pero
                          actualmente se encuentra desactivado por
                          administración y no se aplicará en una nueva
                          evaluación.
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {configuration.mandatory_criteria.length === 0 &&
              selectedCriteria.length === 0 ? (
                <p className={styles.note}>
                  Si no existen criterios automáticos aplicables, la evaluación
                  puede quedar pendiente y no modificar habilitaciones.
                </p>
              ) : null}
              <section
                className={styles.manualReviewConditions}
                aria-labelledby="manual-review-title"
              >
                <h3 id="manual-review-title">Condiciones de revisión manual</h3>
                <label htmlFor="manual-review-conditions">
                  Condiciones que el docente verificará manualmente
                </label>
                <textarea
                  id="manual-review-conditions"
                  maxLength={500}
                  value={manualReviewConditions}
                  onChange={(event) => {
                    setManualReviewConditions(event.currentTarget.value)
                    setConfigurationSaved(false)
                    setEvaluation(null)
                    setEvaluationMustRefresh(false)
                  }}
                />
                <small>
                  Estas condiciones son recordatorios. EIDA no las evalúa
                  automáticamente. El docente debe verificarlas y gestionar la
                  habilitación manualmente.
                </small>
                <small>{manualReviewConditions.length}/500 caracteres</small>
              </section>
              {Object.entries(configurationFieldErrors)
                .filter(([field]) => !configurationErrorCodes[field])
                .map(([field, message]) => (
                  <p className={styles.fieldError} key={field}>
                    {field.startsWith('criteria')
                      ? 'Criterios seleccionados'
                      : parameterLabel(field.split('.').at(-1) ?? field)}
                    : {message}
                  </p>
                ))}
              {configurationError ? (
                <div role="alert" className={styles.error}>
                  <p>{configurationError}</p>
                  {configurationConflict ? (
                    <button
                      type="button"
                      className={sharedStyles.secondaryButton}
                      onClick={() => void reloadConfiguration()}
                    >
                      Recargar configuración del servidor
                    </button>
                  ) : null}
                </div>
              ) : null}
              {configurationSaved ? (
                <p role="status" className={styles.success}>
                  Configuración guardada. La revisión vigente es{' '}
                  {configuration.revision}.
                </p>
              ) : null}
              <div className={styles.configurationSave}>
                <button
                  type="button"
                  className={sharedStyles.primaryButton}
                  disabled={savingConfiguration || !criteriaAreValid}
                  onClick={() => void saveConfiguration()}
                >
                  {savingConfiguration ? 'Guardando…' : 'Guardar configuración'}
                </button>
                <p>
                  Guardar no modifica las habilitaciones. Los resultados se
                  aplican al confirmar la vista previa.
                </p>
              </div>
            </section>
          ) : null}

          {section === 'academic' ? (
            <section aria-labelledby="academic-title">
              <h2 id="academic-title">Datos académicos</h2>
              {schemaLoading ? (
                <p role="status">Cargando esquema CSV…</p>
              ) : null}
              {schemaError ? (
                <div role="alert" className={styles.error}>
                  <p>{schemaError}</p>
                  <button
                    type="button"
                    className={sharedStyles.secondaryButton}
                    onClick={() => void loadSchema()}
                  >
                    Reintentar esquema CSV
                  </button>
                  <details>
                    <summary>Diagnóstico técnico</summary>
                    <pre>{schemaDiagnostic}</pre>
                  </details>
                </div>
              ) : null}
              {configurationDirty || savingConfiguration ? (
                <p role="status">Primero guarda la configuración para descargar la plantilla o importar CSV. Los registros muestran la configuración guardada.</p>
              ) : schema && offeringId && csvLayout ? (
                <AcademicCsvImportPanel
                  key={`${offeringId}:${configuration?.revision}:${csvLayout.columns.map(({ key }) => key).join(',')}:${csvLayout.requiresAssessmentForAttendance}`}
                  offeringId={offeringId}
                  schema={schema}
                  layout={csvLayout}
                  onConfirmed={async () => {
                    await loadRecords(1, '')
                    setRecordSearch('')
                    notify(
                      'success',
                      'La importación académica fue confirmada y los registros se actualizaron.',
                    )
                  }}
                />
              ) : null}
              <div className={styles.panel}>
                <h3 className={styles.recordsHeading}>Registros académicos</h3>
                <div className={styles.recordsToolbar}>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault()
                      void loadRecords(1, recordSearch)
                    }}
                  >
                    <label>
                      Buscar por SIS o estudiante
                      <input
                        type="search"
                        placeholder="SIS o nombre del estudiante"
                        value={recordSearch}
                        onChange={(event) =>
                          setRecordSearch(event.currentTarget.value)
                        }
                      />
                    </label>
                    <button
                      type="submit"
                      className={sharedStyles.secondaryButton}
                    >
                      Buscar
                    </button>
                  </form>
                </div>
                {recordsError ? (
                  <div role="alert" className={styles.error}>
                    <p>{recordsError}</p>
                    <button
                      type="button"
                      className={sharedStyles.secondaryButton}
                      onClick={() => void loadRecords()}
                    >
                      Recargar registros
                    </button>
                    <details>
                      <summary>Diagnóstico técnico</summary>
                      <pre>{recordsDiagnostic}</pre>
                    </details>
                  </div>
                ) : null}
                {recordsLoading ? (
                  <p role="status">Cargando registros…</p>
                ) : null}
                {isPage(records) && records.data.length > 0 ? (
                  <div className={styles.tableWrap}>
                    <table
                      className={`${sharedStyles.table} ${styles.academicRecordsTable}`}
                    >
                      <thead>
                        <tr>
                          <th>Estudiante</th>
                          <th>SIS</th>
                          {csvLayout?.fields.map(({ key, column }) => <th key={key}>{column.label}</th>)}
                          {csvLayout?.includesAttendance ? <><th>Asistencia</th><th>% asistencia</th></> : null}
                          {csvLayout?.includesAverage ? <th>Promedio</th> : null}
                          <th>Revisión</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.data.map((record) => (
                          <tr key={record.id}>
                            <td>
                              {record.first_names} {record.last_names}
                            </td>
                            <td>{record.sis_code}</td>
                            {csvLayout?.fields.map(({ key, scored }) => <td key={key}>{scored ? academicScore(record, key) : record.assessments?.[key] ? (record.assessments[key].was_taken ? 'Sí' : 'No') : '—'}</td>)}
                            {csvLayout?.includesAttendance ? <>
                              <td>{record.attended_classes == null || record.total_classes == null ? '—' : record.attended_classes + ' / ' + record.total_classes}</td>
                              <td>{academicAttendancePercentage(record)}</td>
                            </> : null}
                            {csvLayout?.includesAverage ? <td>{academicAverage(record)}</td> : null}
                            <td>{record.revision}</td>
                            <td>
                              <button
                                type="button"
                                className={sharedStyles.secondaryButton}
                                onClick={() => setSelectedRecord(record)}
                              >
                                Corregir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <PageControls
                      meta={records.meta}
                      onPage={(page) => void loadRecords(page)}
                    />
                  </div>
                ) : null}
                {isPage(records) &&
                records.data.length === 0 &&
                !recordsLoading ? (
                  <p role="status">
                    No hay registros académicos para esta consulta.
                  </p>
                ) : null}
                {selectedRecord && schema && csvLayout ? (
                  <CorrectionForm
                    key={`${selectedRecord.id}:${selectedRecord.revision}`}
                    record={selectedRecord}
                    schema={schema}
                    layout={csvLayout}
                    onCancel={() => setSelectedRecord(null)}
                    onSave={(payload) =>
                      saveCorrection(selectedRecord, payload)
                    }
                    onReload={() => void loadRecords()}
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {section === 'evaluation' ? (
            <section aria-labelledby="evaluation-title">
              <h2 id="evaluation-title">Resultado de evaluación</h2>
              <p>
                Revisa los resultados antes de confirmar. Si falta información,
                se conserva la habilitación vigente del estudiante.
              </p>
              <button
                type="button"
                className={sharedStyles.primaryButton}
                disabled={
                  !configuration || savingConfiguration || evaluationWorking
                }
                onClick={() => void createEvaluationPreview()}
              >
                {evaluationWorking
                  ? 'Procesando…'
                  : 'Generar vista previa de habilitaciones'}
              </button>
              {evaluationError ? (
                <div role="alert" className={styles.error}>
                  <p>{evaluationError}</p>
                  {evaluationMustRefresh ? (
                    <p>
                      Los datos o la revisión cambiaron. Debes generar una nueva
                      vista previa antes de confirmar.
                    </p>
                  ) : null}
                  {configurationConflict || evaluationMustRefresh ? (
                    <button
                      type="button"
                      className={sharedStyles.secondaryButton}
                      onClick={() => {
                        void reloadConfiguration()
                        setEvaluation(null)
                        setEvaluationMustRefresh(true)
                      }}
                    >
                      Recargar configuración
                    </button>
                  ) : null}
                </div>
              ) : null}
              {evaluation ? (
                <div className={styles.panel}>
                  <h3>Resumen antes de confirmar</h3>
                  <p className={styles.note}>
                    Los contadores de decisiones manuales preservadas y
                    pendientes pueden coincidir para una misma persona.
                  </p>
                  {eligibilitySummary ? (
                    <dl className={styles.summary}>
                      <div>
                        <dt>Se actualizarán</dt>
                        <dd>{eligibilitySummary.updates}</dd>
                      </div>
                      <div>
                        <dt>Sin cambios</dt>
                        <dd>{eligibilitySummary.unchanged}</dd>
                      </div>
                      <div>
                        <dt>Decisiones manuales preservadas</dt>
                        <dd>{eligibilitySummary.manual}</dd>
                      </div>
                      <div>
                        <dt>Pendientes</dt>
                        <dd>{eligibilitySummary.pending}</dd>
                      </div>
                      <div>
                        <dt>Estudiantes totales</dt>
                        <dd>{evaluation.summary.total}</dd>
                      </div>
                    </dl>
                  ) : null}
                  <AppliedCriteriaList
                    title="Criterios aplicados"
                    configuration={evaluation.configuration}
                    catalog={evaluation.catalog}
                    assessmentLabels={assessmentLabels}
                  />
                  <div className={styles.resultList}>
                    {evaluation.results.data.map((item) => (
                      <ResultRow
                        key={item.student.id}
                        result={item}
                        criterionLabels={criterionLabels}
                        assessmentLabels={assessmentLabels}
                      />
                    ))}
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={sharedStyles.primaryButton}
                      disabled={evaluationWorking || evaluationMustRefresh}
                      onClick={() => void confirmEvaluation()}
                    >
                      {evaluationWorking
                        ? 'Confirmando…'
                        : 'Confirmar evaluación'}
                    </button>
                    <button
                      type="button"
                      className={sharedStyles.secondaryButton}
                      disabled={evaluationWorking}
                      onClick={() => {
                        setEvaluation(null)
                        void createEvaluationPreview()
                      }}
                    >
                      Generar nuevo preview
                    </button>
                  </div>
                </div>
              ) : null}
              {confirmation ? (
                <div role="status" className={styles.panel}>
                  <h3>Proceso confirmado</h3>
                  <p>
                    Actualizadas: {confirmation.updated} · Sin cambios:{' '}
                    {confirmation.unchanged} · Decisiones manuales preservadas:{' '}
                    {confirmation.manual_preserved} · Pendientes:{' '}
                    {confirmation.pending}
                  </p>
                  {confirmation.updated === 0 ? (
                    <p>No se modificaron habilitaciones</p>
                  ) : null}
                  {confirmation.pending > 0 ? (
                    <p className={styles.note}>
                      Hay estudiantes pendientes por información insuficiente.
                      Sus habilitaciones vigentes se conservan
                    </p>
                  ) : null}
                  {hu12Counts ? (
                    <p>
                      Habilitaciones vigentes: habilitados {hu12Counts.eligible}{' '}
                      · inhabilitados {hu12Counts.ineligible}.
                    </p>
                  ) : (
                    <p>
                      La confirmación se completó; no se pudo actualizar la
                      consulta de habilitaciones. Usa el enlace para volver a
                      consultar.
                    </p>
                  )}
                  <Link to={`/teacher/exams/${examId}/eligibilities${search}`}>
                    Volver a Habilitaciones
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}

          {section === 'history' ? (
            <section aria-labelledby="history-title">
              <h2 id="history-title">Historial consultivo</h2>
              <p className={styles.note}>
                Las fechas con zona horaria se muestran en horario de Bolivia.
                Si no se indica una zona, se conserva el valor recibido.
              </p>
              {historyError ? (
                <p role="alert" className={styles.error}>
                  {historyError}
                </p>
              ) : null}
              {historyLoading ? (
                <p role="status">Consultando historial…</p>
              ) : null}
              <div className={styles.historyGrid}>
                <div className={styles.panel}>
                  <h3>Importaciones y correcciones académicas</h3>
                  {academicHistory?.data.map((entry) => (
                    <HistoryCard
                      key={entry.id}
                      entry={entry}
                      records={records}
                    />
                  ))}
                  {academicHistory?.data.length === 0 ? (
                    <p>No hay actividad académica registrada.</p>
                  ) : null}
                </div>
                <div className={styles.panel}>
                  <h3>Evaluaciones de habilitación</h3>
                  {evaluationHistory?.data.map((entry) => (
                    <article className={styles.historyItem} key={entry.id}>
                      <h4>Evaluación de habilitación</h4>
                      <p>
                        <time dateTime={entry.created_at}>
                          {evaluationDateLabel(entry.created_at)}
                        </time>
                      </p>
                      <p>
                        Estado:{' '}
                        <strong>
                          {entry.confirmed_at
                            ? 'Confirmada'
                            : 'Pendiente de confirmación'}
                        </strong>
                      </p>
                      {entry.confirmation ? (
                        <EvaluationHistorySummary
                          confirmation={entry.confirmation}
                        />
                      ) : null}
                      {entry.created_by ? (
                        <p>
                          Responsable:{' '}
                          {entry.created_by_name?.trim() ||
                            `Usuario #${entry.created_by}`}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className={sharedStyles.secondaryButton}
                        onClick={() => void openEvaluationHistory(entry)}
                      >
                        Ver resultados
                      </button>
                    </article>
                  ))}
                  {evaluationHistory?.data.length === 0 ? (
                    <p>No hay evaluaciones registradas.</p>
                  ) : null}
                </div>
              </div>
              {academicHistory || evaluationHistory ? (
                <div className={styles.actions}>
                  <PageControls
                    meta={academicHistory?.meta ?? evaluationHistory?.meta}
                    onPage={setHistoryPage}
                  />
                </div>
              ) : null}
              {historyDetail ? (
                <div className={styles.panel}>
                  <h3>Detalle histórico de la evaluación</h3>
                  {historyDetail.confirmation ? (
                    <p>
                      Resultado de confirmación: actualizadas{' '}
                      {historyDetail.confirmation.updated}, sin cambios{' '}
                      {historyDetail.confirmation.unchanged}.
                    </p>
                  ) : (
                    <p>Esta evaluación no fue confirmada.</p>
                  )}
                  <AppliedCriteriaList
                    title="Criterios utilizados"
                    configuration={historyDetail.configuration}
                    catalog={historyDetail.catalog}
                    assessmentLabels={assessmentLabels}
                  />
                  <div className={styles.resultList}>
                    {historyDetail.results.data.map((result) => (
                      <ResultRow
                        key={result.student.id}
                        result={result}
                        criterionLabels={criterionLabels}
                        assessmentLabels={assessmentLabels}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </section>
      </PageContainer>
    </main>
  )
}

function PageControls({
  meta,
  onPage,
}: {
  meta: { current_page: number; last_page: number } | undefined
  onPage: (page: number) => void
}) {
  if (!meta || meta.last_page < 2) return null
  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <button
        type="button"
        className={sharedStyles.secondaryButton}
        disabled={meta.current_page <= 1}
        onClick={() => onPage(meta.current_page - 1)}
      >
        Anterior
      </button>
      <span>
        Página {meta.current_page} de {meta.last_page}
      </span>
      <button
        type="button"
        className={sharedStyles.secondaryButton}
        disabled={meta.current_page >= meta.last_page}
        onClick={() => onPage(meta.current_page + 1)}
      >
        Siguiente
      </button>
    </nav>
  )
}

function EvaluationHistorySummary({
  confirmation,
}: {
  confirmation: EvaluationConfirmation
}) {
  const total =
    confirmation.total ?? confirmation.updated + confirmation.unchanged
  const statusCounts = [
    confirmation.eligible !== undefined
      ? `${confirmation.eligible} ${confirmation.eligible === 1 ? 'habilitado' : 'habilitados'}`
      : null,
    confirmation.ineligible !== undefined
      ? `${confirmation.ineligible} ${confirmation.ineligible === 1 ? 'inhabilitado' : 'inhabilitados'}`
      : null,
    confirmation.pending > 0
      ? `${confirmation.pending} ${confirmation.pending === 1 ? 'pendiente' : 'pendientes'}`
      : null,
  ].filter((value): value is string => value !== null)

  return (
    <div className={styles.historySummary}>
      <p>
        {total} {total === 1 ? 'estudiante evaluado' : 'estudiantes evaluados'}
      </p>
      {statusCounts.length ? <p>{statusCounts.join(' · ')}</p> : null}
      {confirmation.eligible === undefined &&
      confirmation.ineligible === undefined ? (
        <p>
          {confirmation.updated}{' '}
          {confirmation.updated === 1
            ? 'habilitación actualizada'
            : 'habilitaciones actualizadas'}{' '}
          · {confirmation.unchanged} sin cambios
        </p>
      ) : null}
      {confirmation.manual_preserved > 0 ? (
        <p>
          {confirmation.manual_preserved}{' '}
          {confirmation.manual_preserved === 1
            ? 'decisión manual preservada'
            : 'decisiones manuales preservadas'}
        </p>
      ) : null}
    </div>
  )
}

function HistoryCard({
  entry,
  records,
}: {
  entry: AcademicHistoryEntry
  records: ApiPage<AcademicRecord> | null
}) {
  const studentId = entry.new_values?.student_id ?? entry.old_values?.student_id
  const student = records?.data.find(
    (record) =>
      record.student_id === studentId || record.id === entry.entity_id,
  )
  const auditName =
    [entry.new_values?.first_names, entry.new_values?.last_names]
      .filter(
        (name): name is string =>
          typeof name === 'string' && name.trim().length > 0,
      )
      .join(' ') ||
    [entry.old_values?.first_names, entry.old_values?.last_names]
      .filter(
        (name): name is string =>
          typeof name === 'string' && name.trim().length > 0,
      )
      .join(' ')
  const auditSis = entry.new_values?.sis_code ?? entry.old_values?.sis_code
  const studentName = student
    ? `${student.first_names} ${student.last_names}`.trim()
    : auditName
  const studentSis =
    student?.sis_code ?? (typeof auditSis === 'string' ? auditSis : null)
  const changes = academicHistoryChanges(entry.old_values, entry.new_values)
  const reason = academicHistoryReason(entry.old_values, entry.new_values)
  const isImport = entry.action.includes('IMPORT')
  const importedCount = academicImportCount(entry)

  return (
    <article className={styles.historyItem}>
      <h4>
        {isImport
          ? 'Importación de datos académicos'
          : academicActionLabel(entry.action)}
      </h4>
      <p>
        <time dateTime={entry.created_at}>
          {evaluationDateLabel(entry.created_at)}
        </time>
      </p>
      <p className={styles.historyLead}>
        {isImport
          ? `${importedCount} ${importedCount === 1 ? 'registro académico creado' : 'registros académicos importados'}`
          : '1 registro académico actualizado'}
      </p>
      {studentName || studentSis ? (
        <p>
          {studentName || 'Estudiante'}
          {studentSis ? ` · SIS ${studentSis}` : ''}
        </p>
      ) : studentId !== undefined ? (
        <p>Estudiante no disponible en los registros académicos cargados.</p>
      ) : null}
      {changes.length ? (
        <dl className={styles.historyChanges}>
          {changes.map((change, index) => (
            <div key={`${change.label}-${index}`}>
              <dt>{change.label}</dt>
              <dd>
                {change.oldValue} → {change.newValue}
              </dd>
            </div>
          ))}
        </dl>
      ) : !isImport ? (
        <p>No se recibieron campos modificados para resumir.</p>
      ) : null}
      {reason ? (
        <p>
          <strong>Motivo</strong>
          <br />
          {reason}
        </p>
      ) : null}
      {entry.user_id ? (
        <p>
          Responsable: {entry.user_name?.trim() || `Usuario #${entry.user_id}`}
        </p>
      ) : null}
    </article>
  )
}

function academicImportCount(entry: AcademicHistoryEntry): number {
  const candidates = [entry.new_values?.created_records]
  const count = candidates.find(
    (value): value is number =>
      typeof value === 'number' && Number.isInteger(value) && value > 0,
  )
  return count ?? 1
}
