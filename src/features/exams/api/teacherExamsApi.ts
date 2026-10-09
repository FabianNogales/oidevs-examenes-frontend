import axios from 'axios'
import { translateVisibleMessage } from '@/shared/api/visibleMessage'

import { httpClient } from '@/shared/api/httpClient'

import type {
  CreateExamPayload,
  Exam,
  ExamCreateResponse,
  Room,
  RoomsResponse,
  TeacherUpcomingExamsResponse,
} from '@/features/exams/types/exam.types'

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string') {
      return translateVisibleMessage(message)
    }

    if (error.response?.status === 401) {
      return 'Tu sesión no está autorizada para esta operación.'
    }

    if (error.response?.status === 403) {
      return 'No tienes autorización para programar este examen.'
    }

    if (error.response?.status === 404) {
      return 'La materia seleccionada no está disponible.'
    }

    if (error.response?.status === 422) {
      return 'Los datos enviados no cumplen la validación del backend.'
    }
  }

  return fallback
}

export type RoomSchedule = {
  exam_date: string
  start_time: string
  duration_minutes: number
}

export async function getRooms(
  schedule: RoomSchedule,
  signal?: AbortSignal,
): Promise<Room[]> {
  const response = await httpClient.get<RoomsResponse>('/rooms', {
    params: schedule,
    signal,
  })
  return response.data.data
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
      getApiErrorMessage(error, 'No se pudo programar el examen.'),
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
