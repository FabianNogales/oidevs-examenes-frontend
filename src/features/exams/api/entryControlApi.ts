import { getRequestStatus } from '@/features/auth/utils/apiErrors'
import { httpClient } from '@/shared/api/httpClient'
import type {
  EntryControlQuery,
  EntryControlStudentResponse,
  EntryControlStudentsResponse,
} from '../types/entryControl.types'

export function getEntryControlErrorMessage(
  error: unknown,
  fallback = 'No se pudo consultar el control de ingreso. Inténtalo nuevamente.',
): string {
  switch (getRequestStatus(error)) {
    case 401:
      // httpClient retains the global session interceptor.
      return 'Tu sesión ha caducado. Inicia sesión nuevamente.'
    case 403:
      return 'Acceso no autorizado al recurso solicitado.'
    case 404:
      return 'El recurso solicitado no fue encontrado.'
    case 422:
      return 'Los parámetros de consulta no son válidos. Revisa la búsqueda y actualiza el control de ingreso.'
    default:
      return fallback
  }
}

export async function getEntryControlStudents(
  examId: number,
  query: EntryControlQuery,
  signal?: AbortSignal,
): Promise<EntryControlStudentsResponse> {
  const response = await httpClient.get<EntryControlStudentsResponse>(
    `/exams/${examId}/entry-control/students`,
    { params: query, signal },
  )
  return response.data
}

export async function getEntryControlStudent(
  examId: number,
  studentId: number,
  roomId: number | undefined,
  signal?: AbortSignal,
): Promise<EntryControlStudentResponse> {
  const response = await httpClient.get<EntryControlStudentResponse>(
    `/exams/${examId}/entry-control/students/${studentId}`,
    { params: { room_id: roomId }, signal },
  )
  return response.data
}
