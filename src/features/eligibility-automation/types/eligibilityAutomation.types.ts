export type AssessmentKey = string

export type ParameterSchema = {
  type: 'number' | 'string' | 'array'
  required?: boolean
  options?: string[]
  minimum?: number
  maximum?: number
  minimum_exclusive?: number
  min_items?: number
}

export type CriterionParameter = ParameterSchema & { key: string }

export type CatalogCriterion = {
  code: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
  revision: number
  parameters: CriterionParameter[]
  mandatory_for_exam_types: string[]
  fixed_parameters: Record<string, unknown> | null
}

export type AutomationCriterion = {
  code: string
  name?: string
  description?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
  revision?: number
  label?: string
  required: boolean
  locked: boolean
  parameters: Record<string, ParameterSchema>
  operator?: string
  threshold?: number
  fixed_parameters?: Record<string, unknown> | null
}

export type AutomationConfiguration = {
  exam_id: number
  evaluation_type: string
  configured_evaluation_type: string | null
  revision: number
  catalog_revision: string
  combination: string
  selected_criteria: SelectedCriterion[]
  mandatory_criteria: SelectedCriterion[]
  inactive_criteria: SelectedCriterion[]
  criteria: SelectedCriterion[]
  manual_review_conditions: string | null
}

export type SelectedCriterion = {
  code: string
  name?: string
  description?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
  criterion_revision?: number
  parameters: Record<string, unknown>
  required: boolean
  locked: boolean
}

export type AutomationOptions = Omit<AutomationConfiguration, 'criteria'> & {
  assessments: { key: string; label: string }[]
  criteria: AutomationCriterion[]
}

export type ConfigurationPayload = {
  revision: number
  catalog_revision: string
  criteria: { code: string; parameters: Record<string, unknown> }[]
  manual_review_conditions: string | null
}

export type AcademicImportMode = 'CREATE_ONLY' | 'MERGE'
export type AcademicValues = {
  assessments: Record<string, { was_taken: boolean; score: number | null }>
  attended_classes: number | null
  total_classes: number | null
}
export type AcademicImportSummary = {
  created_records: number
  updated_records: number
  unchanged_records: number
}

export type ImportSchema = {
  modes?: AcademicImportMode[]
  default_mode?: AcademicImportMode
  merge?: {
    allowed_columns: string[]
    required_columns: string[]
    attendance_columns: string[]
    assessment_columns: string[]
    empty_values: 'PRESERVE'
    reason_required_for_updates: boolean
    reason_max_length: number
    confirmation_revalidates_revisions: boolean
  }
  columns: string[]
  assessment_keys: string[]
  encoding: string
  delimiter: string
  max_rows: number
  max_file_kb: number
  score_min: number
  score_max: number
  score_decimal_places: number
  was_taken_values: string[]
}

export type CsvImportPreview = {
  mode?: AcademicImportMode
  reason?: string
  summary?: AcademicImportSummary
  preview_id: string
  expires_at: string
  can_confirm: boolean
  total_rows: number
  valid_records: {
    action?: 'CREATE' | 'UPDATE' | 'UNCHANGED'
    record_id?: number | null
    revision?: number | null
    before?: AcademicValues
    proposed?: AcademicValues
    student_id: number
    sis: string
    assessments: Record<string, { was_taken: boolean; score: number | null }>
    attended_classes: number | null
    total_classes: number | null
  }[]
  errors: {
    row: number
    sis: string | null
    messages: Record<string, string[]>
  }[]
}

export type CsvImportResult = {
  updated_records?: number
  unchanged_records?: number
  preview_id: string
  created_records: number
  record_ids: number[]
}

export type AcademicRecord = {
  id: number
  course_offering_id: number
  student_id: number
  sis_code: string
  first_names: string
  last_names: string
  assessments: Record<string, { was_taken: boolean; score: number | null }>
  attended_classes: number | null
  total_classes: number | null
  revision: number
}

export type AcademicRecordPayload = {
  revision: number
  reason: string
  assessments: Record<string, { was_taken: boolean; score: number | null }>
  attended_classes: number | null
  total_classes: number | null
}

export type PageMeta = {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export type ApiPage<T> = { data: T[]; meta: PageMeta }

export type AcademicHistoryEntry = {
  id: number
  user_id: number
  user_name?: string | null
  action: string
  entity_type: string
  entity_id: number
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

export type CriterionResult = {
  code: string
  name?: string
  criterion_revision?: number
  status: 'PASSED' | 'FAILED' | 'PENDING'
  actual_value: unknown
  required_value: unknown
  operator?: string
  reason?: string
  missing_fields?: string[]
}

export type EvaluationFilter =
  'ALL' | 'CHANGES' | 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING' | 'PROTECTED'

export type EvaluationQuery = {
  filter: EvaluationFilter
  search: string
  page: number
  per_page: number
}

export type EvaluationResult = {
  student: { id: number; display_name: string; sis: string }
  computed_status: 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING'
  current_status: 'ELIGIBLE' | 'INELIGIBLE' | null
  effective_status: 'ELIGIBLE' | 'INELIGIBLE' | null
  state_will_change?: boolean
  traceability_only?: boolean
  protected_source?: 'MANUAL' | 'LEGACY' | null
  current_reason?: string | null
  effective_reason?: string | null
  manual_override_preserved: boolean
  will_update: boolean
  reason: string
  missing_fields: string[]
  eligibility_revision: number | null
  criteria_results: CriterionResult[]
}

export type EvaluationResults = {
  data: EvaluationResult[]
  meta: PageMeta
}

export type EvaluationView = {
  id: number
  preview_id: string
  exam_id: number
  expires_at: string
  confirmed_at: string | null
  created_at: string
  configuration: AutomationConfiguration
  catalog: CatalogCriterion[] | null
  policy_definition?: Record<string, unknown> | null
  confirmation: EvaluationConfirmation | null
  results: EvaluationResults
  summary: {
    total: number
    eligible: number
    ineligible: number
    pending: number
    effective_eligible?: number
    effective_ineligible?: number
    effective_unset?: number
    state_changes?: number
    traceability_only?: number
    protected?: number
  }
}

export type EvaluationConfirmation = {
  evaluation_id: number
  updated: number
  unchanged: number
  manual_preserved: number
  pending: number
  total?: number
  eligible?: number
  ineligible?: number
}

export type EvaluationHistoryEntry = {
  id: number
  preview_id: string
  exam_id: number
  eligibility_policy_id?: number
  created_by: number
  created_by_name?: string | null
  created_at: string
  confirmed_at: string | null
  confirmation: EvaluationConfirmation | null
}

export type CriterionAuditEntry = {
  id: number
  action: string
  user_id: number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}
