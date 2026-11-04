import { getApiErrorCode, getApiErrorMessage, getApiFieldErrors, getRequestStatus } from '@/features/auth/utils/apiErrors'
import { getExamEligibilities } from '@/features/eligibilities/api/eligibilitiesApi'
import type { ExamEligibility } from '@/features/eligibilities/types/eligibility.types'
import { httpClient } from '@/shared/api/httpClient'
import type {
  AcademicHistoryEntry,
  AcademicRecord,
  AcademicRecordPayload,
  ApiPage,
  AutomationConfiguration,
  AutomationOptions,
  ConfigurationPayload,
  CsvImportPreview,
  CsvImportResult,
  EligibilityPolicy,
  EligibilityPolicyPayload,
  EvaluationConfirmation,
  EvaluationHistoryEntry,
  EvaluationView,
  ImportSchema,
} from '../types/eligibilityAutomation.types'

export class EligibilityAutomationApiError extends Error {
  readonly status: number | null
  readonly code: string | null
  readonly fieldErrors: Record<string, string>

  constructor(
    message: string,
    status: number | null,
    code: string | null,
    fieldErrors: Record<string, string>,
  ) {
    super(message)
    this.name = 'EligibilityAutomationApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

function mapApiError(error: unknown, fallback: string): EligibilityAutomationApiError {
  if (error instanceof EligibilityAutomationApiError) return error
  const status = getRequestStatus(error)
  const fieldErrors = getApiFieldErrors(error)
  const message = getApiErrorMessage(error) ?? fallback
  return new EligibilityAutomationApiError(message, status, getApiErrorCode(error), fieldErrors)
}

async function get<T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  try {
    const response = await httpClient.get<T>(path, { params, signal })
    return response.data
  } catch (error) {
    throw mapApiError(error, 'No se pudo consultar la información de evaluación automática.')
  }
}

async function post<T>(path: string, payload?: unknown, params?: Record<string, unknown>): Promise<T> {
  try {
    const response = await httpClient.post<T>(path, payload, { params })
    return response.data
  } catch (error) {
    throw mapApiError(error, 'No se pudo completar la operación.')
  }
}

export async function getAutomationOptions(examId: number, signal?: AbortSignal): Promise<AutomationOptions> {
  const response = await get<{ data: AutomationOptions }>(
    `/exams/${examId}/eligibility-automation/options`,
    undefined,
    signal,
  )
  return response.data
}

export async function getAutomationConfiguration(examId: number, signal?: AbortSignal): Promise<AutomationConfiguration> {
  const response = await get<{ data: AutomationConfiguration }>(
    `/exams/${examId}/eligibility-automation/configuration`,
    undefined,
    signal,
  )
  return response.data
}

export async function saveAutomationConfiguration(
  examId: number,
  payload: ConfigurationPayload,
): Promise<AutomationConfiguration> {
  try {
    const response = await httpClient.put<{ data: AutomationConfiguration }>(
      `/exams/${examId}/eligibility-automation/configuration`,
      payload,
    )
    return response.data.data
  } catch (error) {
    throw mapApiError(error, 'No se pudo guardar la configuración.')
  }
}

export async function getImportSchema(offeringId: number, signal?: AbortSignal): Promise<ImportSchema> {
  const response = await get<{ data: ImportSchema }>(
    `/academic-offerings/${offeringId}/academic-records/import-schema`,
    undefined,
    signal,
  )
  return response.data
}

export async function previewAcademicImport(offeringId: number, file: File): Promise<CsvImportPreview> {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const response = await httpClient.post<{ data: CsvImportPreview }>(
      `/academic-offerings/${offeringId}/academic-records/imports/preview`,
      formData,
    )
    return response.data.data
  } catch (error) {
    throw mapApiError(error, 'No se pudo generar la vista previa del archivo.')
  }
}

export async function confirmAcademicImport(
  offeringId: number,
  previewId: string,
): Promise<CsvImportResult> {
  return (await post<{ data: CsvImportResult }>(
    `/academic-offerings/${offeringId}/academic-records/imports/${previewId}/confirm`,
  )).data
}

export async function getAcademicRecords(
  offeringId: number,
  page = 1,
  search = '',
  signal?: AbortSignal,
): Promise<ApiPage<AcademicRecord>> {
  const params = { page, per_page: 10, ...(search.trim() ? { search } : {}) }
  return get(`/academic-offerings/${offeringId}/academic-records`, params, signal)
}

export async function correctAcademicRecord(
  offeringId: number,
  recordId: number,
  payload: AcademicRecordPayload,
): Promise<AcademicRecord> {
  try {
    const response = await httpClient.patch<{ data: AcademicRecord }>(
      `/academic-offerings/${offeringId}/academic-records/${recordId}`,
      payload,
    )
    return response.data.data
  } catch (error) {
    throw mapApiError(error, 'No se pudo corregir el registro académico.')
  }
}

export async function getAcademicHistory(
  offeringId: number,
  page = 1,
  signal?: AbortSignal,
): Promise<ApiPage<AcademicHistoryEntry>> {
  return get(`/academic-offerings/${offeringId}/academic-records/history`, { page, per_page: 10 }, signal)
}

export async function previewEligibilityEvaluation(
  examId: number,
  revision: number,
): Promise<EvaluationView> {
  try {
    const response = await httpClient.post<{ data: EvaluationView }>(
      `/exams/${examId}/eligibility-automation/evaluations/preview`,
      { configuration_revision: revision },
      { params: { page: 1, per_page: 100 } },
    )
    return response.data.data
  } catch (error) {
    throw mapApiError(error, 'No se pudo generar la vista previa de habilitaciones.')
  }
}

export async function confirmEligibilityEvaluation(
  examId: number,
  previewId: string,
): Promise<EvaluationConfirmation> {
  return (await post<{ data: EvaluationConfirmation }>(
    `/exams/${examId}/eligibility-automation/evaluations/${previewId}/confirm`,
  )).data
}

export async function confirmEvaluationAndReloadHu12(
  examId: number,
  previewId: string,
): Promise<{
  confirmation: EvaluationConfirmation
  eligibilities: ExamEligibility[] | null
  refreshError: unknown | null
}> {
  const confirmation = await confirmEligibilityEvaluation(examId, previewId)
  try {
    return {
      confirmation,
      eligibilities: await getExamEligibilities(examId),
      refreshError: null,
    }
  } catch (refreshError) {
    return { confirmation, eligibilities: null, refreshError }
  }
}

export async function getEvaluationHistory(
  examId: number,
  page = 1,
  signal?: AbortSignal,
): Promise<ApiPage<EvaluationHistoryEntry>> {
  return get(`/exams/${examId}/eligibility-automation/evaluations`, { page, per_page: 10 }, signal)
}

export async function getEvaluationDetail(
  examId: number,
  evaluationId: number,
  page = 1,
): Promise<EvaluationView> {
  return (await get<{ data: EvaluationView }>(
    `/exams/${examId}/eligibility-automation/evaluations/${evaluationId}`,
    { page, per_page: 100 },
  )).data
}

export async function getAllEvaluationResults(
  examId: number,
  firstPage: EvaluationView,
): Promise<EvaluationView> {
  const results = [...firstPage.results]
  for (let page = 2; page <= firstPage.meta.last_page; page += 1) {
    const next = await getEvaluationDetail(examId, firstPage.id, page)
    results.push(...next.results)
  }
  return { ...firstPage, results }
}

export async function getEligibilityPolicies(page = 1, signal?: AbortSignal): Promise<ApiPage<EligibilityPolicy>> {
  return get('/admin/eligibility-policies', { page, per_page: 10 }, signal)
}

export async function getEligibilityPolicy(policyId: number): Promise<EligibilityPolicy> {
  return (await get<{ data: EligibilityPolicy }>(`/admin/eligibility-policies/${policyId}`)).data
}

export async function createEligibilityPolicy(payload: EligibilityPolicyPayload): Promise<EligibilityPolicy> {
  return (await post<{ data: EligibilityPolicy }>('/admin/eligibility-policies', payload)).data
}

export async function createEligibilityPolicyVersion(
  policyId: number,
  payload: EligibilityPolicyPayload,
): Promise<EligibilityPolicy> {
  return (await post<{ data: EligibilityPolicy }>(
    `/admin/eligibility-policies/${policyId}/versions`,
    payload,
  )).data
}

export async function updateEligibilityPolicy(
  policy: EligibilityPolicy,
  payload: EligibilityPolicyPayload,
): Promise<EligibilityPolicy> {
  try {
    const response = await httpClient.patch<{ data: EligibilityPolicy }>(
      `/admin/eligibility-policies/${policy.id}`,
      { revision: policy.revision, ...payload },
    )
    return response.data.data
  } catch (error) {
    throw mapApiError(error, 'No se pudo guardar la política.')
  }
}

export async function activateEligibilityPolicy(policy: EligibilityPolicy): Promise<EligibilityPolicy> {
  return (await post<{ data: EligibilityPolicy }>(
    `/admin/eligibility-policies/${policy.id}/activate`,
    { revision: policy.revision },
  )).data
}

export function getAutomationError(error: unknown): EligibilityAutomationApiError {
  if (error instanceof EligibilityAutomationApiError) return error
  return mapApiError(error, 'No se pudo completar la operación.')
}
