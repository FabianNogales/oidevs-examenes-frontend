import { httpClient } from '@/shared/api/httpClient'
import type {
  StudentExamQrResponse,
  StudentExamsResponse,
} from '@/features/students/types/studentQr'

export async function getStudentExams(
  signal?: AbortSignal,
): Promise<StudentExamsResponse> {
  const response = await httpClient.get<StudentExamsResponse>(
    '/students/exams',
    {
      signal,
    },
  )
  return response.data
}

export async function getStudentExamQr(
  examId: number,
  signal?: AbortSignal,
): Promise<StudentExamQrResponse> {
  const response = await httpClient.get<StudentExamQrResponse>(
    `/students/exams/${examId}/qr`,
    { signal },
  )
  return response.data
}
