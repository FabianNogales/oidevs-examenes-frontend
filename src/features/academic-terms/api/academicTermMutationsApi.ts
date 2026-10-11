import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import { isAcademicTerm } from './academicTermsApi'
import type {
  AcademicTerm,
  AcademicTermFieldErrors,
  AcademicTermPayload,
  CreateAcademicTermPayload,
} from '../types/academicTerm.types'

export class AcademicTermMutationError extends Error {
  readonly status: number | null
  readonly fieldErrors: AcademicTermFieldErrors
  readonly conflictingPeriod: AcademicTerm | null
  constructor(
    message: string,
    status: number | null = null,
    fieldErrors: AcademicTermFieldErrors = {},
    conflictingPeriod: AcademicTerm | null = null,
  ) {
    super(message)
    this.name = 'AcademicTermMutationError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.conflictingPeriod = conflictingPeriod
  }
}

export function mapAcademicTermMutationError(
  error: unknown,
): AcademicTermMutationError {
  if (error instanceof AcademicTermMutationError) return error
  const status = axios.isAxiosError(error)
    ? (error.response?.status ?? null)
    : null
  const body = axios.isAxiosError(error) ? error.response?.data : null
  const fields: AcademicTermFieldErrors = {}
  if (body?.errors && typeof body.errors === 'object') {
    for (const field of ['name', 'start_date', 'end_date', 'status'] as const) {
      const messages = body.errors[field]
      if (Array.isArray(messages) && typeof messages[0] === 'string')
        fields[field] = messages[0]
    }
  }
  const message =
    status === 404
      ? 'El periodo solicitado ya no existe. Actualiza el catálogo.'
      : status === 403
        ? 'No tienes permisos para guardar periodos académicos.'
        : status === 409 && body?.code === 'ACADEMIC_TERM_ACTIVE_CONFLICT'
          ? 'Ya existe un periodo activo. Desactívalo antes de activar otro.'
          : status === 409
            ? 'Los datos cambiaron mientras trabajabas. Revisa el catálogo antes de continuar.'
            : status === 422
              ? 'Revisa los campos indicados antes de guardar.'
              : status === null
                ? 'No se pudo confirmar el guardado. Revisa tu conexión y consulta el catálogo antes de reintentar.'
                : 'No se pudo guardar el periodo. Conservamos los datos para que puedas reintentar.'
  return new AcademicTermMutationError(
    message,
    status,
    fields,
    isAcademicTerm(body?.conflicting_period) ? body.conflicting_period : null,
  )
}

function readSavedTerm(value: unknown, id?: number): AcademicTerm {
  if (!isAcademicTerm(value) || (id !== undefined && value.id !== id))
    throw new AcademicTermMutationError(
      'No se pudo verificar el periodo guardado. Actualiza el catálogo antes de reintentar.',
    )
  return value
}

export async function createAcademicTerm(
  payload: CreateAcademicTermPayload,
): Promise<AcademicTerm> {
  try {
    const response = await httpClient.post('/admin/academic-terms', payload)
    const term = readSavedTerm(response.data?.data)
    if (term.status !== payload.status)
      throw new AcademicTermMutationError(
        'El servidor no confirmó el estado elegido. Actualiza el catálogo antes de reintentar.',
      )
    return term
  } catch (error) {
    throw mapAcademicTermMutationError(error)
  }
}

export async function editAcademicTerm(
  id: number,
  payload: AcademicTermPayload,
): Promise<AcademicTerm> {
  try {
    // Build the editable body explicitly: PUT must never change status implicitly.
    const response = await httpClient.put(`/admin/academic-terms/${id}`, {
      name: payload.name,
      start_date: payload.start_date,
      end_date: payload.end_date,
    })
    return readSavedTerm(response.data?.data, id)
  } catch (error) {
    throw mapAcademicTermMutationError(error)
  }
}
