import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { parseExamId } from '@/features/exams/api/examDetailsApi'
import { useExamDetail } from '@/features/exams/hooks/useExamDetail'
import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import pageStyles from '@/features/exams/pages/TeacherExamsPage.module.css'
import {
  confirmAcademicImport,
  confirmEvaluationAndReloadHu12,
  correctAcademicRecord,
  EligibilityAutomationApiError,
  getAcademicHistory,
  getAllEvaluationResults,
  getAutomationConfiguration,
  getAutomationOptions,
  getEvaluationDetail,
  getEvaluationHistory,
  previewAcademicImport,
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
  CsvImportPreview,
  CsvImportResult,
  EvaluationConfirmation,
  EvaluationHistoryEntry,
  EvaluationResult,
  EvaluationView,
  ImportSchema,
  SelectedCriterion,
} from '../types/eligibilityAutomation.types'
import styles from './EligibilityAutomation.module.css'
import { useAcademicData } from '../hooks/useAcademicData'
import { academicActionLabel, academicHistoryChanges, academicHistoryReason, assessmentLabel, combinationLabel, conditionLabel, criterionErrorCode, criterionLabel, evaluationDateLabel, evaluationTypeLabel, missingFieldLabel, parameterLabel } from '../utils/automationPresentation'

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
      return Array.isArray(value) && value.length >= (schema.min_items ?? 0)
    }
    if (schema.type === 'string') {
      return typeof value === 'string' && value.length > 0
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) return false
    if (schema.min !== undefined && value < schema.min) return false
    if (schema.max !== undefined && value > schema.max) return false
    if (schema.exclusive_min !== undefined && value <= schema.exclusive_min) return false
    return true
  })
}

function displayStatus(status: string | null | undefined): string {
  if (status === 'ELIGIBLE') return 'Habilitado'
  if (status === 'INELIGIBLE') return 'Inhabilitado'
  if (status === 'PENDING') return 'Pendiente por información insuficiente'
  return 'Sin decisión vigente'
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function isPage<T>(value: ApiPage<T> | null): value is ApiPage<T> {
  return value !== null
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
      <fieldset className={`${styles.parameter} ${styles.assessmentOptions}`} aria-describedby={`${id}-hint`}>
        <legend>{label}</legend>
          {(schema.options ?? []).map((option) => (
            <label className={styles.criterionHeading} key={option}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(event) => onChange(event.currentTarget.checked
                  ? [...selected, option]
                  : selected.filter((item) => item !== option))}
              />
              <span>{assessmentLabel(option, assessmentLabels[option])}</span>
            </label>
          ))}
        <small id={`${id}-hint`}>Marca las evaluaciones que deseas incluir.{schema.min_items ? ` Selecciona al menos ${schema.min_items}.` : ''}</small>
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
        min={schema.min ?? schema.exclusive_min}
        max={schema.max}
        value={typeof value === 'number' ? value : ''}
        onChange={(event) =>
          onChange(event.currentTarget.value === '' ? '' : Number(event.currentTarget.value))
        }
      />
      {schema.exclusive_min !== undefined || schema.min !== undefined || schema.max !== undefined ? (
        <small>
          {schema.exclusive_min !== undefined
            ? `Mayor que ${schema.exclusive_min}`
            : `Mínimo ${schema.min ?? '—'}`}
          {schema.max !== undefined ? `; máximo ${schema.max}` : ''}
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
    <article className={`${styles.criterion} ${locked ? styles.requiredCriterion : ''}`} aria-describedby={fieldErrors.length ? `errors-${criterion.code}` : undefined}>
      <label className={styles.criterionHeading}>
        <input
          type="checkbox"
          checked={locked || selected !== undefined}
          disabled={locked}
          onChange={(event) => onToggle(criterion, event.currentTarget.checked)}
        />
        <span>
          <strong>{criterionLabel(criterion.code, criterion.label)}</strong>
          {locked ? <small className={styles.criterionBadges}>
            {criterion.required ? <span className={styles.badge}>Obligatorio</span> : null}
            <span className={styles.badge}>Bloqueado</span>
          </small> : null}
        </span>
      </label>
      {criterion.operator !== undefined || criterion.threshold !== undefined ? (
        <p className={styles.note}>
          Condición institucional: {conditionLabel(criterion.operator, criterion.threshold)}
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
              onChange={(value) => onParameterChange(criterion.code, key, value)}
            />
          ))}
        </div>
      ) : null}
      {fieldErrors.length ? <div id={`errors-${criterion.code}`} role="alert">{fieldErrors.map(({ field, message }) => <p className={styles.fieldError} key={field}>{message}</p>)}</div> : null}
    </article>
  )
}

function CorrectionForm({
  record,
  schema,
  assessments,
  onCancel,
  onSave,
  onReload,
}: {
  record: AcademicRecord
  schema: ImportSchema
  assessments: { key: string; label: string }[]
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
      const apiError = cause instanceof EligibilityAutomationApiError ? cause : null
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
    <form className={styles.correction} onSubmit={(event) => void submit(event)}>
      <h3>Corrección explícita del registro</h3>
      <p>
        {record.first_names} {record.last_names} · SIS {record.sis_code} · revisión {record.revision}
      </p>
      {schema.assessment_keys.map((key) => {
        const assessment = values.assessments[key]
        const label = assessments.find((item) => item.key === key)?.label ?? key
        return (
          <fieldset className={styles.assessmentFields} key={key}>
            <legend>{label}</legend>
            <label>
              Estado de la evaluación
              <select
                value={assessment ? (assessment.was_taken ? 'taken' : 'not_taken') : ''}
                onChange={(event) => {
                  const status = event.currentTarget.value
                  setValues((current) => {
                    const nextAssessments = { ...current.assessments }
                    if (!status) {
                      delete nextAssessments[key]
                    } else {
                      nextAssessments[key] = {
                        was_taken: status === 'taken',
                        score: status === 'taken' ? nextAssessments[key]?.score ?? null : null,
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
            <label>
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
                          ...(current.assessments[key] ?? { was_taken: true, score: null }),
                          score: value === '' ? null : Number(value),
                        },
                      },
                    }))
                  }}
                />
            </label>
          </fieldset>
        )
      })}
      <div className={styles.formGrid}>
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
      </div>
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
        <p className={styles.fieldError} key={field}>{field}: {message}</p>
      ))}
      {error ? (
        <div role="alert" className={styles.error}>
          <p>{error}</p>
          {conflict ? (
            <button type="button" className={sharedStyles.secondaryButton} onClick={onReload}>
              Recargar registros sin perder esta corrección
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={styles.actions}>
        <button type="button" className={sharedStyles.secondaryButton} onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className={sharedStyles.primaryButton} disabled={saving || Object.keys(values.assessments).length === 0 || !values.reason.trim()}>
          {saving ? 'Guardando…' : 'Guardar corrección'}
        </button>
      </div>
    </form>
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
        <span className={`${styles.status} ${result.manual_override_preserved ? styles.manual : ''}`}>
          {result.manual_override_preserved
            ? `Decisión vigente: ${displayStatus(result.effective_status)}`
            : displayStatus(result.computed_status)}
        </span>
      </div>
      {result.manual_override_preserved ? (
        <p className={styles.manualNotice}>Se conserva la decisión manual vigente.</p>
      ) : null}
      <dl className={styles.resultDetails}>
        <div><dt>Resultado calculado</dt><dd>{displayStatus(result.computed_status)}</dd></div>
        <div><dt>Estado actual</dt><dd>{displayStatus(result.current_status)}</dd></div>
        <div><dt>Estado efectivo</dt><dd>{displayStatus(result.effective_status)}</dd></div>
        <div><dt>Se actualizará</dt><dd>{result.will_update ? 'Sí' : 'No'}</dd></div>
        <div><dt>Política</dt><dd>v{result.policy.version}</dd></div>
      </dl>
      <p className={styles.reasonText}>{result.reason || '—'}</p>
      {result.missing_fields.length > 0 ? (
        <p className={styles.note}>Información faltante: {result.missing_fields.map((field) => missingFieldLabel(field, assessmentLabels)).join(', ')}</p>
      ) : null}
      {result.criteria_results.length > 0 ? (
        <details>
          <summary>Resultados por criterio</summary>
          <ul className={styles.criteriaResults}>
            {result.criteria_results.map((item, index) => (
                  <li key={`${item.code}-${index}`}>
                    <strong>{criterionLabel(item.code, criterionLabels[item.code])}</strong>
                <span>{item.status === 'PASSED' ? 'Cumple' : item.status === 'FAILED' ? 'No cumple' : 'Pendiente'}</span>
                    {'actual_value' in item ? (
                  <span>Valor actual: {displayValue(item.actual_value)}</span>
                ) : null}
                    {'required_value' in item ? (
                  <span>Valor requerido: {displayValue(item.required_value)}</span>
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
  const [configuration, setConfiguration] = useState<AutomationConfiguration | null>(null)
  const [selectedCriteria, setSelectedCriteria] = useState<SelectedCriterion[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [initialError, setInitialError] = useState('')
  const [configurationError, setConfigurationError] = useState('')
  const [configurationFieldErrors, setConfigurationFieldErrors] = useState<Record<string, string>>({})
  const [configurationErrorCodes, setConfigurationErrorCodes] = useState<Record<string, string | null>>({})
  const [configurationConflict, setConfigurationConflict] = useState(false)
  const [configurationSaved, setConfigurationSaved] = useState(false)
  const [savingConfiguration, setSavingConfiguration] = useState(false)
  const [recordSearch, setRecordSearch] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<AcademicRecord | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<CsvImportPreview | null>(null)
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null)
  const [csvError, setCsvError] = useState('')
  const [csvWorking, setCsvWorking] = useState(false)
  const [evaluation, setEvaluation] = useState<EvaluationView | null>(null)
  const [evaluationError, setEvaluationError] = useState('')
  const [evaluationWorking, setEvaluationWorking] = useState(false)
  const [evaluationMustRefresh, setEvaluationMustRefresh] = useState(false)
  const [confirmation, setConfirmation] = useState<EvaluationConfirmation | null>(null)
  const [hu12Counts, setHu12Counts] = useState<{ eligible: number; ineligible: number } | null>(null)
  const [academicHistory, setAcademicHistory] = useState<ApiPage<AcademicHistoryEntry> | null>(null)
  const [evaluationHistory, setEvaluationHistory] = useState<ApiPage<EvaluationHistoryEntry> | null>(null)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyError, setHistoryError] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyDetail, setHistoryDetail] = useState<EvaluationView | null>(null)
  const offeringId = examState.detail?.course_offering_id
  const { schema, schemaError, schemaLoading, records, recordsError, recordsLoading, schemaDiagnostic, recordsDiagnostic, loadSchema, loadRecords } = useAcademicData(offeringId, section === 'academic')
  const importFileId = useId()

  const loadConfiguration = useCallback(async () => {
    if (examId === null) return
    const [available, current] = await Promise.all([
      getAutomationOptions(examId),
      getAutomationConfiguration(examId),
    ])
    setOptions(available)
    setConfiguration(current)
    setSelectedCriteria(current.selected_criteria.filter((item) => !item.required && !item.locked))
  }, [examId])

  useEffect(() => {
    let active = true
    if (examId === null) return
    void Promise.resolve().then(() => {
      if (active) setInitialLoading(true)
      return Promise.all([
        getAutomationOptions(examId),
        getAutomationConfiguration(examId),
      ])
    }).then(([available, current]) => {
      if (!active) return
      setOptions(available)
      setConfiguration(current)
      setSelectedCriteria(current.selected_criteria.filter((item) => !item.required && !item.locked))
      setInitialError('')
    }).catch((error: unknown) => {
      if (active) setInitialError(getErrorMessage(error, 'No se pudo cargar el catálogo y la configuración.'))
    }).finally(() => {
      if (active) setInitialLoading(false)
    })
    return () => { active = false }
  }, [examId])

  useEffect(() => {
    if (section !== 'history' || !offeringId || examId === null) return
    let active = true
    void Promise.resolve().then(() => {
      if (active) setHistoryLoading(true)
      return Promise.all([
        getAcademicHistory(offeringId, historyPage),
        getEvaluationHistory(examId, historyPage),
      ])
    }).then(([academic, evaluations]) => {
      if (!active) return
      setAcademicHistory(academic)
      setEvaluationHistory(evaluations)
      setHistoryError('')
    }).catch((error: unknown) => {
      if (active) setHistoryError(getErrorMessage(error, 'No se pudo consultar el historial.'))
    }).finally(() => {
      if (active) setHistoryLoading(false)
    })
    return () => { active = false }
  }, [section, offeringId, examId, historyPage])

  const optionalCriteria = useMemo(
    () => (options?.criteria ?? []).filter((criterion) => !criterion.required && !criterion.locked),
    [options],
  )
  const criteriaAreValid = selectedCriteria.every((selected) => {
    const criterion = optionalCriteria.find((item) => item.code === selected.code)
    return criterion !== undefined && criteriaValidationMessage(criterion, selected.parameters)
  })
  const unavailableSelectedCriteria = selectedCriteria.filter(
    (selected) => !optionalCriteria.some((criterion) => criterion.code === selected.code),
  )

  function toggleCriterion(criterion: AutomationCriterion, enabled: boolean) {
    setConfigurationSaved(false)
    setSelectedCriteria((current) => {
      if (enabled) {
        if (current.some((item) => item.code === criterion.code)) return current
        const parameters = Object.fromEntries(
          Object.entries(criterion.parameters).map(([key, schema]) => [
            key,
            schema.type === 'array' ? [] : schema.type === 'number' ? '' : '',
          ]),
        )
        return [...current, { code: criterion.code, parameters, required: false, locked: false }]
      }
      return current.filter((item) => item.code !== criterion.code)
    })
  }

  function changeCriterionParameter(code: string, key: string, value: unknown) {
    setConfigurationSaved(false)
    setSelectedCriteria((current) =>
      current.map((item) =>
        item.code === code ? { ...item, parameters: { ...item.parameters, [key]: value } } : item,
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
        const metadata = optionalCriteria.find((criterion) => criterion.code === item.code)
        const parameters = Object.fromEntries(
          Object.entries(item.parameters).map(([key, value]) => [
            key,
            metadata?.parameters[key]?.type === 'number' && value !== '' ? Number(value) : value,
          ]),
        )
        return { code: item.code, parameters }
      })
      const updated = await saveAutomationConfiguration(examId, {
        revision: configuration.revision,
        criteria,
      })
      setConfiguration(updated)
      setSelectedCriteria(updated.selected_criteria.filter((item) => !item.required && !item.locked))
      setConfigurationSaved(true)
      notify('success', 'La configuración de evaluación automática fue guardada.')
    } catch (error) {
      const apiError = error instanceof EligibilityAutomationApiError ? error : null
      setConfigurationError(getErrorMessage(error, 'No se pudo guardar la configuración.'))
      if (apiError) {
        setConfigurationFieldErrors(apiError.fieldErrors)
        setConfigurationErrorCodes(Object.fromEntries(Object.keys(apiError.fieldErrors).map((field) => [field, criterionErrorCode(field, selectedCriteria)])))
        setConfigurationConflict(apiError.status === 409)
      }
    } finally {
      setSavingConfiguration(false)
    }
  }

  async function reloadConfiguration() {
    setInitialLoading(true)
    setInitialError('')
    setConfigurationError('')
    setConfigurationConflict(false)
    try {
      await loadConfiguration()
    } catch (error) {
      setInitialError(getErrorMessage(error, 'No se pudo recargar la configuración.'))
    } finally {
      setInitialLoading(false)
    }
  }

  async function previewCsv() {
    if (!offeringId || !csvFile) return
    setCsvWorking(true)
    setCsvError('')
    setCsvResult(null)
    try {
      setCsvPreview(await previewAcademicImport(offeringId, csvFile))
    } catch (error) {
      setCsvError(getErrorMessage(error, 'No se pudo generar la vista previa del CSV.'))
    } finally {
      setCsvWorking(false)
    }
  }

  async function confirmCsv() {
    if (!offeringId || !csvPreview?.can_confirm) return
    setCsvWorking(true)
    setCsvError('')
    try {
      const result = await confirmAcademicImport(offeringId, csvPreview.preview_id)
      setCsvResult(result)
      setCsvPreview(null)
      await loadRecords(1, '')
      setRecordSearch('')
      notify('success', 'La importación académica fue confirmada y los registros se actualizaron.')
    } catch (error) {
      setCsvError(getErrorMessage(error, 'No se pudo confirmar la importación.'))
    } finally {
      setCsvWorking(false)
    }
  }

  async function saveCorrection(record: AcademicRecord, payload: AcademicRecordPayload) {
    if (!offeringId) return
    await correctAcademicRecord(offeringId, record.id, payload)
    setSelectedRecord(null)
    notify('success', 'El registro académico fue corregido. La habilitación requiere una nueva evaluación explícita.')
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
      const firstPage = await previewEligibilityEvaluation(examId, configuration.revision)
      setEvaluation(await getAllEvaluationResults(examId, firstPage))
    } catch (error) {
      const apiError = error instanceof EligibilityAutomationApiError ? error : null
      setEvaluationError(getErrorMessage(error, 'No se pudo generar la vista previa.'))
      if (apiError?.status === 409) setEvaluationMustRefresh(true)
    } finally {
      setEvaluationWorking(false)
    }
  }

  async function confirmEvaluation() {
    if (!evaluation || examId === null || evaluationMustRefresh) return
    setEvaluationWorking(true)
    setEvaluationError('')
    try {
      const { confirmation: result, eligibilities: current, refreshError } =
        await confirmEvaluationAndReloadHu12(examId, evaluation.preview_id)
      setConfirmation(result)
      setEvaluation(null)
      if (current) {
        setHu12Counts(current.reduce(
          (counts, item) => {
            if (item.status === 'ELIGIBLE') counts.eligible += 1
            if (item.status === 'INELIGIBLE') counts.ineligible += 1
            return counts
          },
          { eligible: 0, ineligible: 0 },
        ))
        notify('success', result.updated === 0 ? 'Proceso confirmado. No se modificaron habilitaciones.' : 'El proceso de habilitación fue confirmado.')
      } else {
        const detail = getErrorMessage(refreshError, 'Error no especificado.')
        setEvaluationError(`El proceso fue confirmado, pero no se pudo actualizar la consulta de habilitaciones (${detail}). Vuelve a Habilitaciones para consultar los estados vigentes.`)
        notify('info', 'El proceso se confirmó; vuelve a consultar las habilitaciones vigentes.')
      }
    } catch (error) {
      const apiError = error instanceof EligibilityAutomationApiError ? error : null
      setEvaluationError(getErrorMessage(error, 'No se pudo confirmar la evaluación.'))
      if (apiError?.status === 409) {
        setEvaluationMustRefresh(true)
        setEvaluation(null)
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
      setHistoryError(getErrorMessage(error, 'No se pudo consultar el detalle histórico.'))
    }
  }

  const eligibilitySummary = evaluation
    ? {
        updates: evaluation.results.filter((item) => item.will_update).length,
        unchanged: evaluation.results.filter((item) => !item.will_update).length,
        manual: evaluation.results.filter((item) => item.manual_override_preserved).length,
        pending: evaluation.results.filter((item) => item.computed_status === 'PENDING').length,
      }
    : null

  if (examId === null) {
    return <main className={pageStyles.page}><section className={pageStyles.content}><h1>Habilitación automática</h1><p role="alert">El identificador del examen no es válido.</p></section></main>
  }

  return (
    <main className={pageStyles.page}>
      <section className={pageStyles.content}>
        <Breadcrumbs items={[
          { label: 'Mis exámenes', to: `/teacher/exams${search}` },
          { label: 'Habilitaciones', to: `/teacher/exams/${examId}/eligibilities${search}` },
          { label: 'Habilitación automática' },
        ]} />
        <header className={pageStyles.pageHeader}>
          <h1>Habilitación automática</h1>
          <p>{examState.exam?.name ?? `Examen #${examId}`}: configura los criterios, revisa los datos académicos y confirma los resultados.</p>
          <Link to={`/teacher/exams/${examId}/eligibilities${search}`}>Volver a Habilitaciones</Link>
        </header>
        {examState.isLoading ? <p role="status">Cargando examen…</p> : null}
        {examState.errorMessage ? <p role="alert" className={styles.error}>{examState.errorMessage}</p> : null}
        {!offeringId && !examState.isLoading ? (
          <p role="alert" className={styles.error}>No se pudo identificar la oferta académica del examen. Recarga la página para consultar sus registros.</p>
        ) : null}
        <nav className={styles.sectionNav} aria-label="Secciones de habilitación automática">
          {SECTIONS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? styles.activeSection : ''}
              aria-current={section === item.id ? 'step' : undefined}
              onClick={() => setSection(item.id)}
            >
              <span>{index + 1}</span>{item.label}
            </button>
          ))}
        </nav>
        {initialLoading ? <p role="status">Cargando catálogo y configuración…</p> : null}
        {initialError ? <div role="alert" className={styles.error}><p>{initialError}</p><button type="button" className={sharedStyles.secondaryButton} onClick={() => void reloadConfiguration()}>Reintentar</button></div> : null}

        {section === 'configuration' && options && configuration ? (
          <section aria-labelledby="configuration-title">
            <h2 id="configuration-title">Configuración</h2>
            <dl className={styles.configurationMetadata}>
              <div><dt>Política y versión</dt><dd>Política {configuration.policy.id} · versión {configuration.policy.version}</dd></div>
              <div><dt>Tipo de evaluación</dt><dd>{evaluationTypeLabel(configuration.evaluation_type)}</dd></div>
              <div><dt>Revisión</dt><dd>{configuration.revision}</dd></div>
              <div><dt>Combinación</dt><dd>{combinationLabel(configuration.combination)}</dd></div>
            </dl>
            <p className={styles.note}>Selecciona los criterios opcionales que deseas aplicar. Los requisitos institucionales obligatorios siempre se mantienen activos.</p>
            {unavailableSelectedCriteria.length > 0 ? (
              <p role="alert" className={styles.error}>
                El servidor reportó criterios configurados que no están disponibles en el catálogo actual ({unavailableSelectedCriteria.map((item) => item.code).join(', ')}). No se enviará una configuración incompleta.
              </p>
            ) : null}
            <h3>Criterios obligatorios</h3>
            <div className={styles.requiredCriteria}>
            {options.criteria.filter((criterion) => criterion.required || criterion.locked).map((criterion) => (
              <CriterionEditor
                key={criterion.code}
                criterion={criterion}
                selected={configuration.mandatory_criteria.find((item) => item.code === criterion.code)}
                onToggle={() => undefined}
                onParameterChange={() => undefined}
                assessmentLabels={Object.fromEntries(options.assessments.map((item) => [item.key, item.label]))}
              />
            ))}
            </div>
            <h3>Criterios opcionales</h3>
            {optionalCriteria.length === 0 ? <p>No hay criterios opcionales disponibles para esta configuración.</p> : null}
            <div className={`${styles.criterionList} ${styles.optionalCriteria}`}>
              {optionalCriteria.map((criterion) => (
                <CriterionEditor
                  key={criterion.code}
                  criterion={criterion}
                  selected={selectedCriteria.find((item) => item.code === criterion.code)}
                  onToggle={toggleCriterion}
                  onParameterChange={changeCriterionParameter}
                  assessmentLabels={Object.fromEntries(options.assessments.map((item) => [item.key, item.label]))}
                  fieldErrors={Object.entries(configurationFieldErrors).filter(([field]) => configurationErrorCodes[field] === criterion.code).map(([field, message]) => ({ field, message }))}
                />
              ))}
            </div>
            {Object.entries(configurationFieldErrors).filter(([field]) => !configurationErrorCodes[field]).map(([field, message]) => (
              <p className={styles.fieldError} key={field}>{field}: {message}</p>
            ))}
            {configurationError ? (
              <div role="alert" className={styles.error}>
                <p>{configurationError}</p>
                {configurationConflict ? <button type="button" className={sharedStyles.secondaryButton} onClick={() => void reloadConfiguration()}>Recargar configuración del servidor</button> : null}
              </div>
            ) : null}
            {configurationSaved ? <p role="status" className={styles.success}>Configuración guardada. La revisión vigente es {configuration.revision}.</p> : null}
            <div className={styles.configurationSave}>
              <button
                type="button"
                className={sharedStyles.primaryButton}
                disabled={savingConfiguration || !criteriaAreValid}
                onClick={() => void saveConfiguration()}
              >
                {savingConfiguration ? 'Guardando…' : 'Guardar configuración'}
              </button>
              <p>Guardar no modifica las habilitaciones. Los resultados se aplican al confirmar la vista previa.</p>
            </div>
          </section>
        ) : null}

        {section === 'academic' ? (
          <section aria-labelledby="academic-title">
            <h2 id="academic-title">Datos académicos</h2>
            {schemaLoading ? <p role="status">Cargando esquema CSV…</p> : null}
            {schemaError ? <div role="alert" className={styles.error}><p>{schemaError}</p><button type="button" className={sharedStyles.secondaryButton} onClick={() => void loadSchema()}>Reintentar esquema CSV</button><details><summary>Diagnóstico técnico</summary><pre>{schemaDiagnostic}</pre></details></div> : null}
            {schema ? (
              <div className={styles.panel}>
                <h3>Importación CSV</h3>
                <p>Formato del archivo: {schema.encoding}, separador “{schema.delimiter}”, máximo {schema.max_rows} filas y {schema.max_file_kb} KB.</p>
                <p>Columnas requeridas (en este orden): <code>{schema.columns.join(schema.delimiter)}</code></p>
                <label htmlFor={importFileId}>Seleccionar CSV</label>
                <input
                  id={importFileId}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setCsvFile(event.currentTarget.files?.[0] ?? null)
                    setCsvPreview(null)
                    setCsvResult(null)
                    setCsvError('')
                  }}
                />
                <div className={styles.actions}>
                  <button type="button" className={sharedStyles.primaryButton} disabled={!csvFile || csvWorking} onClick={() => void previewCsv()}>
                    {csvWorking ? 'Procesando…' : 'Generar preview CSV'}
                  </button>
                </div>
                {csvError ? <p role="alert" className={styles.error}>{csvError}</p> : null}
                {csvPreview ? (
                  <div className={styles.panel} aria-live="polite">
                    <h4>Preview del CSV</h4>
                    <details><summary>Detalle técnico</summary><code>{csvPreview.preview_id}</code></details>
                    <p>Filas válidas: {csvPreview.valid_records.length} · Errores: {csvPreview.errors.length} · Total: {csvPreview.total_rows}</p>
                    <p>{csvPreview.can_confirm ? 'La vista previa está lista para confirmar.' : 'No se puede confirmar: revisa los errores del archivo.'}</p>
                    {csvPreview.errors.length > 0 ? (
                      <ul className={styles.errorList}>
                        {csvPreview.errors.map((item, index) => (
                          <li key={`${item.row}-${index}`}>Fila {item.row} · SIS {item.sis ?? '—'}: {Object.values(item.messages).flat().join(' ')}</li>
                        ))}
                      </ul>
                    ) : null}
                    {csvPreview.valid_records.length > 0 ? (
                      <details><summary>Registros incluidos en el preview</summary><pre>{JSON.stringify(csvPreview.valid_records, null, 2)}</pre></details>
                    ) : null}
                    <div className={styles.actions}>
                      <button type="button" className={sharedStyles.primaryButton} disabled={!csvPreview.can_confirm || csvWorking} onClick={() => void confirmCsv()}>
                        Confirmar importación
                      </button>
                    </div>
                  </div>
                ) : null}
                {csvResult ? <p role="status" className={styles.success}>Importación confirmada: {csvResult.created_records} registros creados. Se actualizaron los registros académicos.</p> : null}
              </div>
            ) : null}
            <div className={styles.panel}>
              <h3 className={styles.recordsHeading}>Registros académicos</h3>
              <div className={styles.recordsToolbar}>
                <form onSubmit={(event) => { event.preventDefault(); void loadRecords(1, recordSearch) }}>
                  <label>
                    Buscar por SIS o estudiante
                    <input type="search" placeholder="SIS o nombre del estudiante" value={recordSearch} onChange={(event) => setRecordSearch(event.currentTarget.value)} />
                  </label>
                  <button type="submit" className={sharedStyles.secondaryButton}>Buscar</button>
                </form>
              </div>
              {recordsError ? <div role="alert" className={styles.error}><p>{recordsError}</p><button type="button" className={sharedStyles.secondaryButton} onClick={() => void loadRecords()}>Recargar registros</button><details><summary>Diagnóstico técnico</summary><pre>{recordsDiagnostic}</pre></details></div> : null}
              {recordsLoading ? <p role="status">Cargando registros…</p> : null}
              {isPage(records) && records.data.length > 0 ? (
                <div className={styles.tableWrap}>
                  <table className={sharedStyles.table}>
                    <thead><tr><th>Estudiante</th><th>SIS</th><th>Evaluaciones</th><th>Asistencia</th><th>Revisión</th><th>Acción</th></tr></thead>
                    <tbody>
                      {records.data.map((record) => (
                        <tr key={record.id}>
                          <td>{record.first_names} {record.last_names}</td>
                          <td>{record.sis_code}</td>
                          <td>{(schema?.assessment_keys ?? []).map((key) => {
                            const item = record.assessments?.[key]
                            return (
                            <span className={styles.recordAssessment} key={key}>
                              {options?.assessments.find((assessment) => assessment.key === key)?.label ?? key}: {item ? `${item.was_taken ? 'Rindió' : 'No rindió'} · nota ${item.score ?? '—'}` : 'Sin dato'}
                            </span>
                            )
                          })}</td>
                          <td>{record.attended_classes === null || record.attended_classes === undefined || record.total_classes === null || record.total_classes === undefined ? '—' : `${record.attended_classes} / ${record.total_classes}`}</td>
                          <td>{record.revision}</td>
                          <td><button type="button" className={sharedStyles.secondaryButton} onClick={() => setSelectedRecord(record)}>Corregir</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PageControls meta={records.meta} onPage={(page) => void loadRecords(page)} />
                </div>
              ) : null}
              {isPage(records) && records.data.length === 0 && !recordsLoading ? <p role="status">No hay registros académicos para esta consulta.</p> : null}
              {selectedRecord && schema ? (
                <CorrectionForm
                  key={`${selectedRecord.id}:${selectedRecord.revision}`}
                  record={selectedRecord}
                  schema={schema}
                  assessments={options?.assessments ?? []}
                  onCancel={() => setSelectedRecord(null)}
                  onSave={(payload) => saveCorrection(selectedRecord, payload)}
                  onReload={() => void loadRecords()}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {section === 'evaluation' ? (
          <section aria-labelledby="evaluation-title">
            <h2 id="evaluation-title">Resultado de evaluación</h2>
            <p>Revisa los resultados antes de confirmar. Si falta información, se conserva la habilitación vigente del estudiante.</p>
            <button type="button" className={sharedStyles.primaryButton} disabled={!configuration || savingConfiguration || evaluationWorking} onClick={() => void createEvaluationPreview()}>
              {evaluationWorking ? 'Procesando…' : 'Generar vista previa de habilitaciones'}
            </button>
            {evaluationError ? (
              <div role="alert" className={styles.error}>
                <p>{evaluationError}</p>
                {evaluationMustRefresh ? <p>Los datos o la revisión cambiaron. Debes generar una nueva vista previa antes de confirmar.</p> : null}
                {configurationConflict || evaluationMustRefresh ? <button type="button" className={sharedStyles.secondaryButton} onClick={() => { void reloadConfiguration(); setEvaluation(null); setEvaluationMustRefresh(true) }}>Recargar configuración</button> : null}
              </div>
            ) : null}
            {evaluation ? (
              <div className={styles.panel}>
                <h3>Resumen antes de confirmar</h3>
                <p>Política {evaluation.configuration.policy.id}, versión {evaluation.configuration.policy.version} · revisión {evaluation.configuration.revision}</p>
                <details><summary>Detalle técnico</summary><pre>{JSON.stringify(evaluation, null, 2)}</pre></details>
                <p className={styles.note}>Los contadores de decisiones manuales preservadas y pendientes pueden coincidir para una misma persona.</p>
                {eligibilitySummary ? (
                  <dl className={styles.summary}>
                    <div><dt>Se actualizarán</dt><dd>{eligibilitySummary.updates}</dd></div>
                    <div><dt>Sin cambios</dt><dd>{eligibilitySummary.unchanged}</dd></div>
                    <div><dt>Decisiones manuales preservadas</dt><dd>{eligibilitySummary.manual}</dd></div>
                    <div><dt>Pendientes</dt><dd>{eligibilitySummary.pending}</dd></div>
                    <div><dt>Estudiantes totales</dt><dd>{evaluation.summary.total}</dd></div>
                  </dl>
                ) : null}
                <div className={styles.resultList}>{evaluation.results.map((item) => <ResultRow key={item.student.id} result={item} criterionLabels={Object.fromEntries((options?.criteria ?? []).map((criterion) => [criterion.code, criterionLabel(criterion.code, criterion.label)]))} assessmentLabels={Object.fromEntries((options?.assessments ?? []).map((assessment) => [assessment.key, assessment.label]))} />)}</div>
                <div className={styles.actions}>
                  <button type="button" className={sharedStyles.primaryButton} disabled={evaluationWorking || evaluationMustRefresh} onClick={() => void confirmEvaluation()}>
                    {evaluationWorking ? 'Confirmando…' : 'Confirmar evaluación'}
                  </button>
                  <button type="button" className={sharedStyles.secondaryButton} disabled={evaluationWorking} onClick={() => { setEvaluation(null); void createEvaluationPreview() }}>
                    Generar nuevo preview
                  </button>
                </div>
              </div>
            ) : null}
            {confirmation ? (
              <div role="status" className={styles.panel}>
                <h3>Proceso confirmado</h3>
                <p>Actualizadas: {confirmation.updated} · Sin cambios: {confirmation.unchanged} · Decisiones manuales preservadas: {confirmation.manual_preserved} · Pendientes: {confirmation.pending}</p>
                {confirmation.updated === 0 ? <p>No se modificaron habilitaciones</p> : null}
                {confirmation.pending > 0 ? <p className={styles.note}>Hay estudiantes pendientes por información insuficiente. Sus habilitaciones vigentes se conservan</p> : null}
                {hu12Counts ? <p>Habilitaciones vigentes: habilitados {hu12Counts.eligible} · inhabilitados {hu12Counts.ineligible}.</p> : <p>La confirmación se completó; no se pudo actualizar la consulta de habilitaciones. Usa el enlace para volver a consultar.</p>}
                <Link to={`/teacher/exams/${examId}/eligibilities${search}`}>Volver a Habilitaciones</Link>
              </div>
            ) : null}
          </section>
        ) : null}

        {section === 'history' ? (
          <section aria-labelledby="history-title">
            <h2 id="history-title">Historial consultivo</h2>
            <p className={styles.note}>Las fechas con zona horaria se muestran en horario de Bolivia. Si no se indica una zona, se conserva el valor recibido.</p>
            {historyError ? <p role="alert" className={styles.error}>{historyError}</p> : null}
            {historyLoading ? <p role="status">Consultando historial…</p> : null}
            <div className={styles.historyGrid}>
              <div className={styles.panel}>
                <h3>Importaciones y correcciones académicas</h3>
                {academicHistory?.data.map((entry) => <HistoryCard key={entry.id} entry={entry} records={records} />)}
                {academicHistory?.data.length === 0 ? <p>No hay actividad académica registrada.</p> : null}
              </div>
              <div className={styles.panel}>
                <h3>Evaluaciones de habilitación</h3>
                {evaluationHistory?.data.map((entry) => (
                  <article className={styles.historyItem} key={entry.id}>
                    <h4>Evaluación #{entry.id}</h4>
                    <p>Creada: <time dateTime={entry.created_at}>{evaluationDateLabel(entry.created_at)}</time></p>
                    <p>Estado: {entry.confirmed_at ? 'Confirmada' : 'Sin confirmar'}</p>
                    {entry.confirmed_at ? <p>Confirmada el: <time dateTime={entry.confirmed_at}>{evaluationDateLabel(entry.confirmed_at)}</time></p> : null}
                    {entry.confirmation ? (
                      <dl className={styles.summary}>
                        <div><dt>Actualizadas</dt><dd>{entry.confirmation.updated}</dd></div>
                        <div><dt>Sin cambios</dt><dd>{entry.confirmation.unchanged}</dd></div>
                        <div><dt>Decisiones manuales preservadas</dt><dd>{entry.confirmation.manual_preserved}</dd></div>
                        <div><dt>Pendientes</dt><dd>{entry.confirmation.pending}</dd></div>
                      </dl>
                    ) : null}
                    <details className={styles.technicalDetail}><summary>Detalle técnico</summary><pre>{JSON.stringify(entry, null, 2)}</pre></details>
                    <button type="button" className={sharedStyles.secondaryButton} onClick={() => void openEvaluationHistory(entry)}>Consultar detalle histórico</button>
                  </article>
                ))}
                {evaluationHistory?.data.length === 0 ? <p>No hay evaluaciones registradas.</p> : null}
              </div>
            </div>
            {(academicHistory || evaluationHistory) ? (
              <div className={styles.actions}>
                <PageControls
                  meta={academicHistory?.meta ?? evaluationHistory?.meta}
                  onPage={setHistoryPage}
                />
              </div>
            ) : null}
            {historyDetail ? (
              <div className={styles.panel}>
                <h3>Detalle de la evaluación #{historyDetail.id}</h3>
                <p>Política {historyDetail.configuration.policy.id}, versión {historyDetail.configuration.policy.version} · revisión {historyDetail.configuration.revision}</p>
                {historyDetail.confirmation ? <p>Resultado de confirmación: actualizadas {historyDetail.confirmation.updated}, sin cambios {historyDetail.confirmation.unchanged}.</p> : <p>Esta evaluación no fue confirmada.</p>}
                <div className={styles.resultList}>{historyDetail.results.map((result) => <ResultRow key={result.student.id} result={result} criterionLabels={Object.fromEntries((options?.criteria ?? []).map((criterion) => [criterion.code, criterionLabel(criterion.code, criterion.label)]))} assessmentLabels={Object.fromEntries((options?.assessments ?? []).map((assessment) => [assessment.key, assessment.label]))} />)}</div>
                <details><summary>Detalle técnico completo</summary><pre>{JSON.stringify(historyDetail, null, 2)}</pre></details>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
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
      <button type="button" className={sharedStyles.secondaryButton} disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>Anterior</button>
      <span>Página {meta.current_page} de {meta.last_page}</span>
      <button type="button" className={sharedStyles.secondaryButton} disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>Siguiente</button>
    </nav>
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
  const student = records?.data.find((record) =>
    record.student_id === studentId || record.id === entry.entity_id,
  )
  const auditName = [entry.new_values?.first_names, entry.new_values?.last_names]
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .join(' ')
    || [entry.old_values?.first_names, entry.old_values?.last_names]
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      .join(' ')
  const auditSis = entry.new_values?.sis_code ?? entry.old_values?.sis_code
  const studentName = student
    ? `${student.first_names} ${student.last_names}`.trim()
    : auditName
  const studentSis = student?.sis_code ?? (typeof auditSis === 'string' ? auditSis : null)
  const changes = academicHistoryChanges(entry.old_values, entry.new_values)
  const reason = academicHistoryReason(entry.old_values, entry.new_values)

  return (
    <article className={styles.historyItem}>
      <h4>{academicActionLabel(entry.action)}</h4>
      <p><time dateTime={entry.created_at}>{evaluationDateLabel(entry.created_at)}</time></p>
      {studentName || studentSis ? (
        <p>{studentName || 'Estudiante'}{studentSis ? ` · SIS ${studentSis}` : ''}</p>
      ) : studentId !== undefined ? (
        <p>Estudiante no disponible en los registros académicos cargados.</p>
      ) : null}
      {changes.length ? (
        <dl className={styles.historyChanges}>
          {changes.map((change, index) => (
            <div key={`${change.label}-${index}`}>
              <dt>{change.label}</dt>
              <dd>{change.oldValue} → {change.newValue}</dd>
            </div>
          ))}
        </dl>
      ) : <p>No se recibieron campos modificados para resumir.</p>}
      {reason ? <p><strong>Motivo</strong><br />{reason}</p> : null}
      {entry.user_id ? <p>Responsable: Usuario #{entry.user_id}</p> : null}
      <details className={styles.technicalDetail}>
        <summary>Detalle técnico</summary>
        <pre>{JSON.stringify(entry, null, 2)}</pre>
      </details>
    </article>
  )
}
