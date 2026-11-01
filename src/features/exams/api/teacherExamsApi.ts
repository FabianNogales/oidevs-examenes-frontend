import axios from 'axios'
import { translateVisibleMessage } from '@/shared/api/visibleMessage'
import { httpClient } from '@/shared/api/httpClient'
import type {
  CreateExamPayload,
  Exam,
  ExamCreateResponse,
  OfferingSchedulingMeta,
  Room,
  RoomsResponse,
  TeacherUpcomingExamsResponse,
} from '@/features/exams/types/exam.types'

// Mapa de mensajes de error por código de estado HTTP
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  401: 'Tu sesión no está autorizada para esta operación.',
  403: 'No tienes autorización para programar este examen.',
  404: 'La materia seleccionada no está disponible.',
  422: 'Los datos enviados no cumplen la validación del backend.',
}

function ResolveApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback

  const serverMessage = error.response?.data?.message
  if (typeof serverMessage === 'string') {
    return translateVisibleMessage(serverMessage)
  }

  const status = error.response?.status
  return (status && HTTP_STATUS_MESSAGES[status]) || fallback
}

export type RoomSchedule = {
  exam_date?: string
  start_time?: string
  duration_minutes?: number
  exclude_exam_id?: number
  course_offering_id?: number | string
}

export async function getRoomsWithMeta(
  schedule?: RoomSchedule,
  signal?: AbortSignal,
): Promise<{ rooms: Room[]; meta: OfferingSchedulingMeta | null }> {
  const response = await httpClient.get<RoomsResponse>('/rooms', {
    params: schedule,
    signal,
  })
  return {
    rooms: response.data.data,
    meta: response.data.meta ?? null,
  }
}

export async function getRooms(
  schedule?: RoomSchedule,
  signal?: AbortSignal,
): Promise<Room[]> {
  const { rooms } = await getRoomsWithMeta(schedule, signal)
  return rooms
}

export async function createExam(
  courseOfferingId: string | number,
  payload: CreateExamPayload,
): Promise<Exam> {
  try {
    const response = await httpClient.post<ExamCreateResponse>(
      `/course-offerings/${courseOfferingId}/exams`,
      payload,
    )
    return response.data.data
  } catch (error) {
    throw new Error(
      ResolveApiErrorMessage(error, 'No se pudo programar el examen.'),
      { cause: error },
    )
  }
}

export async function getTeacherUpcomingExams(): Promise<
  TeacherUpcomingExamsResponse['data']
> {
  const response = await httpClient.get<TeacherUpcomingExamsResponse>(
    '/teacher/dashboard/upcoming-exams',
  )
  return response.data.data
}