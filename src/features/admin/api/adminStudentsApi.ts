import axios from 'axios'

import type {
  CreateStudentPayload,
  GetStudentsParams,
  StudentDetail,
  StudentField,
  StudentFieldErrors,
  Student,
  StudentsPageResult,
  StudentsResponse,
  StudentStatus,
  UpdateStudentPayload,
} from '@/features/admin/types/student.types'
import type {
  StudentImportConfirmation,
  StudentImportPreview,
} from '@/features/students/types/studentImport'
import { httpClient } from '@/shared/api/httpClient'

const STUDENTS_ENDPOINT = '/admin/students'
type ApiStudent = Omit<Student, 'id' | 'institutional_code'> & {
  id: string | number
  sis_code: string
}
type ApiStudentDetail = ApiStudent & Omit<StudentDetail, keyof Student>

function normalizeStudent<T extends ApiStudent>(student: T) {
  return { ...student, id: String(student.id), institutional_code: student.sis_code }
}

function toApiPayload(payload: UpdateStudentPayload) {
  const { institutional_code, ...fields } = payload
  return institutional_code === undefined
    ? fields
    : { ...fields, sis_code: institutional_code }
}

const STUDENT_FIELDS: StudentField[] = [
  'institutional_code',
  'identity_number',
  'first_names',
  'last_names',
  'email',
  'career_id',
]

export class StudentApiError extends Error {
  status: number | null
  fieldErrors: StudentFieldErrors

  constructor(
    message: string,
    status: number | null = null,
    fieldErrors: StudentFieldErrors = {},
  ) {
    super(message)

    this.name = 'StudentApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function getResponseMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('message' in data)) {
    return null
  }
  const message = (data as { message?: unknown }).message
  return typeof message === 'string' ? message : null
}

function getFieldErrors(data: unknown): StudentFieldErrors {
  if (typeof data !== 'object' || data === null || !('errors' in data)) {
    return {}
  }

  const errors = (data as { errors?: unknown }).errors

  if (typeof errors !== 'object' || errors === null) {
    return {}
  }

  const fieldErrors: StudentFieldErrors = {}

  for (const field of STUDENT_FIELDS) {
    const messages = (errors as Record<string, unknown>)[
      field === 'institutional_code' ? 'sis_code' : field
    ]

    if (Array.isArray(messages) && messages.every((msg) => typeof msg === 'string')) {
      fieldErrors[field] = messages
    }
  }

  return fieldErrors
}

function mapStudentApiError(error: unknown, fallbackMessage: string): StudentApiError {
  if (!axios.isAxiosError(error)) {
    return new StudentApiError(fallbackMessage)
  }

  const status = error.response?.status ?? null
  const data = error.response?.data

  const backendMessage = getResponseMessage(data)
  let message = backendMessage ?? fallbackMessage

  if (status === 401) {
    message = 'Tu sesión expiró. Inicia sesión nuevamente.'
  }

  if (status === 403) {
    message = 'No tienes permisos para realizar esta operación.'
  }

  if (status === 404) {
    message = 'El estudiante solicitado no existe.'
  }

  if (status === 409 && !backendMessage) {
    message = 'El SIS, CI o correo ya fue registrado. Verifica los datos.'
  }

  if (status === 422 && !backendMessage) {
    message = 'Existen datos inválidos. Revisa el formulario.'
  }

  if (status !== null && status >= 500) {
    message = 'El servidor no pudo completar la operación. Inténtalo nuevamente.'
  }

  return new StudentApiError(message, status, getFieldErrors(data))
}

export async function getAdminStudents(
  { page = 1, perPage = 10, search = '' }: GetStudentsParams = {},
): Promise<StudentsPageResult> {
  try {
    const response = await httpClient.get<Omit<StudentsResponse, 'data'> & { data: ApiStudent[] }>(STUDENTS_ENDPOINT, {
      params: {
        page,
        per_page: perPage,
        search: search.trim() || undefined,
      },
    })

    return {
      students: response.data.data.map(normalizeStudent),
      meta: response.data.meta,
    }
  } catch (error) {
    throw mapStudentApiError(error, 'No se pudieron cargar los estudiantes.')
  }
}

export async function getAdminStudent(studentId: string): Promise<StudentDetail> {
  try {
    const response = await httpClient.get<{ data: ApiStudentDetail }>(
      `${STUDENTS_ENDPOINT}/${studentId}`,
    )
    return normalizeStudent(response.data.data)
  } catch (error) {
    throw mapStudentApiError(error, 'No se pudo cargar la información del estudiante.')
  }
}

export async function createAdminStudent(payload: CreateStudentPayload): Promise<Student> {
  try {
    const response = await httpClient.post<{ data: ApiStudent }>(STUDENTS_ENDPOINT, toApiPayload(payload))
    return normalizeStudent(response.data.data)
  } catch (error) {
    throw mapStudentApiError(error, 'No se pudo registrar el estudiante.')
  }
}

export async function updateAdminStudent(
  studentId: string,
  payload: UpdateStudentPayload,
): Promise<StudentDetail> {
  try {
    const response = await httpClient.patch<{ data: ApiStudentDetail }>(
      `${STUDENTS_ENDPOINT}/${studentId}`,
      toApiPayload(payload),
    )
    return normalizeStudent(response.data.data)
  } catch (error) {
    throw mapStudentApiError(error, 'No se pudo actualizar el estudiante.')
  }
}

export async function updateAdminStudentStatus(
  studentId: string,
  status: StudentStatus,
): Promise<Student> {
  try {
    const response = await httpClient.patch<{ data: ApiStudent }>(
      `${STUDENTS_ENDPOINT}/${studentId}/status`,
      { status },
    )
    return normalizeStudent(response.data.data)
  } catch (error) {
    throw mapStudentApiError(error, 'No se pudo cambiar el estado del estudiante.')
  }
}

function buildCsvFormData(file: File): FormData {
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

export async function previewStudentsImport(file: File): Promise<StudentImportPreview> {
  try {
    const response = await httpClient.post<{ data: StudentImportPreview }>(
      `${STUDENTS_ENDPOINT}/import/preview`,
      buildCsvFormData(file),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data.data
  } catch (error) {
    throw mapStudentApiError(error, 'No se pudo generar la vista previa del CSV.')
  }
}

export async function confirmStudentsImport(file: File): Promise<StudentImportConfirmation> {
  try {
    const response = await httpClient.post<{ data: StudentImportConfirmation }>(
      `${STUDENTS_ENDPOINT}/import/confirm`,
      buildCsvFormData(file),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data.data
  } catch (error) {
    throw mapStudentApiError(error, 'No se pudo importar el archivo CSV.')
  }
}
