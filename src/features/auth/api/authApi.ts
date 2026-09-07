import { backendHttpClient, httpClient } from '@/shared/api/httpClient'
import type {
  AuthenticatedUser,
  CurrentUserResponse,
  LoginCredentials,
} from '@/features/auth/types/auth'

export async function getCsrfCookie(): Promise<void> {
  await backendHttpClient.get('/sanctum/csrf-cookie')
}

export async function login(credentials: LoginCredentials): Promise<void> {
  await backendHttpClient.post('/login', credentials)
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  const response = await httpClient.get<CurrentUserResponse>('/me')

  return response.data.data
}

export async function logout(): Promise<void> {
  await backendHttpClient.post('/logout')
}
