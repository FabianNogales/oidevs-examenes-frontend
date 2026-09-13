import { httpClient } from '@/shared/api/httpClient'

import type { CurrentUserResponse } from '@/features/auth/types/auth.types'

export async function getCurrentUser() {
  const response = await httpClient.get<CurrentUserResponse>(
    '/api/v1/me',
  )

  return response.data.data
}
