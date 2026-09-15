import { httpClient } from '@/shared/api/httpClient'

import type { CurrentUserResponse } from '@/features/auth/types/auth.types'

export async function getCurrentUser() {
  const response = await httpClient.get<CurrentUserResponse>(
    '/me',
  )

  return response.data.data
}

export async function logout() {
  await httpClient.post('/auth/logout')
}
