import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type {
  AcademicTerm,
  AcademicTermsQuery,
  AcademicTermsResponse,
} from '../types/academicTerm.types'
import { isAcademicTermDate } from '../utils/academicTermDate'

const BASE = '/admin/academic-terms'

export function isAcademicTerm(value: unknown): value is AcademicTerm {
  if (!value || typeof value !== 'object') return false
  const term = value as AcademicTerm
  return (
    Number.isSafeInteger(term.id) &&
    term.id > 0 &&
    typeof term.name === 'string' &&
    Boolean(term.name.trim()) &&
    isAcademicTermDate(term.start_date) &&
    isAcademicTermDate(term.end_date) &&
    term.end_date >= term.start_date &&
    ['ACTIVE', 'INACTIVE'].includes(term.status)
  )
}

export class AcademicTermApiError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'AcademicTermApiError'
    this.status = status
  }
}

export function getAcademicTermError(error: unknown): AcademicTermApiError {
  if (error instanceof AcademicTermApiError) return error
  if (!axios.isAxiosError(error))
    return new AcademicTermApiError(
      'No se pudieron consultar los periodos. Inténtalo nuevamente.',
    )
  const status = error.response?.status ?? null
  const message =
    status === null
      ? 'No se pudo conectar con el servidor. Revisa tu conexión.'
      : status === 403
        ? 'No tienes permisos para consultar los periodos académicos.'
        : status === 404 || status === 501
          ? 'La gestión de periodos aún no está disponible en el servidor.'
          : status === 409 &&
              error.response?.data?.code === 'ACADEMIC_TERM_STATE_INCONSISTENT'
            ? 'Se detectó más de un periodo activo. Solicita una revisión de los periodos registrados.'
            : 'No se pudieron consultar los periodos. Inténtalo nuevamente.'
  return new AcademicTermApiError(message, status)
}

function invalidResponse(): never {
  throw new AcademicTermApiError(
    'El servidor devolvió datos de periodos inválidos. Inténtalo nuevamente.',
  )
}

export async function getAcademicTerms(
  query: AcademicTermsQuery,
  signal: AbortSignal,
): Promise<AcademicTermsResponse> {
  try {
    const response = await httpClient.get<AcademicTermsResponse>(BASE, {
      signal,
      params: {
        ...query,
        per_page: 15,
        search: query.search || undefined,
        status: query.status || undefined,
      },
    })
    const result = response.data
    const meta = result?.meta
    if (
      !Array.isArray(result?.data) ||
      !result.data.every(isAcademicTerm) ||
      !meta ||
      ![meta.current_page, meta.last_page, meta.per_page, meta.total].every(
        Number.isSafeInteger,
      ) ||
      meta.current_page < 1 ||
      meta.last_page < meta.current_page ||
      meta.per_page < 1 ||
      meta.per_page > 100 ||
      meta.total < 0 ||
      meta.last_page !== Math.max(1, Math.ceil(meta.total / meta.per_page)) ||
      result.data.length !==
        Math.min(
          meta.per_page,
          Math.max(0, meta.total - (meta.current_page - 1) * meta.per_page),
        ) ||
      (meta.total === 0
        ? meta.from !== null || meta.to !== null
        : meta.from !== (meta.current_page - 1) * meta.per_page + 1 ||
          meta.to !== meta.from + result.data.length - 1) ||
      new Set(result.data.map((term) => term.id)).size !== result.data.length
    )
      invalidResponse()
    return result
  } catch (error) {
    throw getAcademicTermError(error)
  }
}

export async function getActiveAcademicTerm(
  signal: AbortSignal,
): Promise<AcademicTerm | null> {
  try {
    const response = await httpClient.get<{ data: AcademicTerm | null }>(
      `${BASE}/active`,
      { signal },
    )
    const term = response.data?.data
    if (term !== null && (!isAcademicTerm(term) || term.status !== 'ACTIVE'))
      invalidResponse()
    return term
  } catch (error) {
    throw getAcademicTermError(error)
  }
}

export async function getAcademicTerm(
  id: number,
  signal: AbortSignal,
): Promise<AcademicTerm> {
  try {
    const response = await httpClient.get<{ data: AcademicTerm }>(
      `${BASE}/${id}`,
      { signal },
    )
    if (!isAcademicTerm(response.data?.data) || response.data.data.id !== id)
      invalidResponse()
    return response.data.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404)
      throw new AcademicTermApiError('El periodo solicitado ya no existe.', 404)
    throw getAcademicTermError(error)
  }
}
