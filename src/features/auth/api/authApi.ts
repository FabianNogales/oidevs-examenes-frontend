import { backendHttpClient, httpClient } from '@/shared/api/httpClient'
import type {
  AuthenticatedUser,
  ChangePasswordPayload,
  CurrentUserResponse,
  ForgotPasswordPayload,
  LoginCredentials,
  ResetPasswordPayload,
} from '@/features/auth/types/auth'

async function getCsrfCookie(): Promise<void> {
  await backendHttpClient.get('/sanctum/csrf-cookie')
}

export async function login(credentials: LoginCredentials): Promise<void> {
  await getCsrfCookie()
  await backendHttpClient.post('/login', credentials)
}

export async function getCurrentUser(): Promise<AuthenticatedUser> {
  const response = await httpClient.get<CurrentUserResponse>('/me')

  return response.data.data
}

export async function logout(): Promise<void> {
  await backendHttpClient.post('/logout')
}

export async function updatePassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  await getCsrfCookie()
  await backendHttpClient.put('/user/password', payload)
}

export async function forgotPassword(
  payload: ForgotPasswordPayload,
): Promise<void> {
  await getCsrfCookie()
  await backendHttpClient.post('/forgot-password', payload)
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<void> {
  await getCsrfCookie()
  await backendHttpClient.post('/reset-password', payload)
}
