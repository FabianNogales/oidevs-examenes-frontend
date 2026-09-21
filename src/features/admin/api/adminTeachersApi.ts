import axios from 'axios'

import type {
  GetTeachersParams,
  Teacher,
  TeacherField,
  TeacherFieldErrors,
  TeacherFormValues,
  TeacherResponse,
  TeachersPageResult,
  TeachersResponse,
  TeacherStatus,
} from '@/features/admin/types/teacher.types'
import { httpClient } from '@/shared/api/httpClient'

const TEACHERS_ENDPOINT = '/admin/teachers'

const TEACHER_FIELDS: TeacherField[] = [
  'institutional_code',
  'identity_number',
  'first_names',
  'last_names',
  'email',
]

export class TeacherApiError extends Error {
  status: number | null
  fieldErrors: TeacherFieldErrors

  constructor(
    message: string,
    status: number | null = null,
    fieldErrors: TeacherFieldErrors = {},
  ) {
    super(message)

    this.name = 'TeacherApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function getResponseMessage(
  data: unknown,
): string | null {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('message' in data)
  ) {
    return null
  }

  const message = (data as { message?: unknown }).message

  return typeof message === 'string'
    ? message
    : null
}

function getFieldErrors(
  data: unknown,
): TeacherFieldErrors {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('errors' in data)
  ) {
    return {}
  }

  const errors = (data as { errors?: unknown }).errors

  if (
    typeof errors !== 'object' ||
    errors === null
  ) {
    return {}
  }

  const fieldErrors: TeacherFieldErrors = {}

  for (const field of TEACHER_FIELDS) {
    const messages = (
      errors as Record<string, unknown>
    )[field]

    if (
      Array.isArray(messages) &&
      messages.every(
        (message) => typeof message === 'string',
      )
    ) {
      fieldErrors[field] = messages
    }
  }

  return fieldErrors
}

function mapTeacherApiError(
  error: unknown,
  fallbackMessage: string,
): TeacherApiError {
  if (!axios.isAxiosError(error)) {
    return new TeacherApiError(fallbackMessage)
  }

  const status = error.response?.status ?? null
  const data = error.response?.data

  const backendMessage =
    getResponseMessage(data)

  let message =
    backendMessage ?? fallbackMessage

  if (status === 403) {
    message =
      'No tienes permisos para realizar esta operación.'
  }

  if (status === 404) {
    message =
      'El docente solicitado no existe.'
  }

  if (status === 422 && !backendMessage) {
    message =
      'Existen datos inválidos. Revisa el formulario.'
  }

  if (status !== null && status >= 500) {
    message =
      'El servidor no pudo completar la operación. Inténtalo nuevamente.'
  }

  return new TeacherApiError(
    message,
    status,
    getFieldErrors(data),
  )
}

export async function getAdminTeachers(
  {
    page = 1,
    perPage = 15,
    search = '',
  }: GetTeachersParams = {},
): Promise<TeachersPageResult> {
  try {
    const response =
      await httpClient.get<TeachersResponse>(
        TEACHERS_ENDPOINT,
        {
          params: {
            page,
            per_page: perPage,
            search:
              search.trim() || undefined,
          },
        },
      )

    return {
      teachers: response.data.data,
      meta: response.data.meta,
    }
  } catch (error) {
    throw mapTeacherApiError(
      error,
      'No se pudieron cargar los docentes.',
    )
  }
}

export async function getAdminTeacher(
  teacherId: number,
): Promise<Teacher> {
  try {
    const response =
      await httpClient.get<TeacherResponse>(
        `${TEACHERS_ENDPOINT}/${teacherId}`,
      )

    return response.data.data
  } catch (error) {
    throw mapTeacherApiError(
      error,
      'No se pudo cargar la información del docente.',
    )
  }
}

export async function createAdminTeacher(
  values: TeacherFormValues,
): Promise<Teacher> {
  try {
    const response =
      await httpClient.post<TeacherResponse>(
        TEACHERS_ENDPOINT,
        values,
      )

    return response.data.data
  } catch (error) {
    throw mapTeacherApiError(
      error,
      'No se pudo registrar al docente.',
    )
  }
}

export async function updateAdminTeacher(
  teacherId: number,
  values: TeacherFormValues,
): Promise<Teacher> {
  try {
    const response =
      await httpClient.put<TeacherResponse>(
        `${TEACHERS_ENDPOINT}/${teacherId}`,
        values,
      )

    return response.data.data
  } catch (error) {
    throw mapTeacherApiError(
      error,
      'No se pudo actualizar al docente.',
    )
  }
}

export async function updateAdminTeacherStatus(
  teacherId: number,
  status: TeacherStatus,
): Promise<Teacher> {
  try {
    const response =
      await httpClient.patch<TeacherResponse>(
        `${TEACHERS_ENDPOINT}/${teacherId}/status`,
        {
          status,
        },
      )

    return response.data.data
  } catch (error) {
    throw mapTeacherApiError(
      error,
      'No se pudo cambiar el estado del docente.',
    )
  }
}