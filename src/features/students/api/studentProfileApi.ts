import { httpClient } from '@/shared/api/httpClient'
import type { StudentProfileResponse } from '@/features/students/types/studentProfile'

export async function getStudentProfile(
  signal?: AbortSignal,
): Promise<StudentProfileResponse> {
  const response = await httpClient.get<StudentProfileResponse>(
    '/students/profile',
    { signal },
  )
  return response.data
}

export async function updateStudentProfilePhoto(
  photo: File,
  signal?: AbortSignal,
): Promise<StudentProfileResponse> {
  const formData = new FormData()
  formData.append('photo', photo)

  const response = await httpClient.post<StudentProfileResponse>(
    '/students/profile/photo',
    formData,
    { signal },
  )
  return response.data
}
