import axios from 'axios'
import { env } from '@/app/config/env'
import { emitAuthSessionEvent } from '@/features/auth/utils/authEvents'

function registerAuthSessionInterceptor(client: ReturnType<typeof axios.create>) {
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        const code = readErrorCode(error.response.data)

        emitAuthSessionEvent({
          reason: code === 'SESSION_REPLACED' ? 'SESSION_REPLACED' : 'SESSION_EXPIRED',
        })
      }

      return Promise.reject(error)
    },
  )
}

function readErrorCode(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('code' in data)) {
    return null
  }

  const code = (data as { code?: unknown }).code

  return typeof code === 'string' ? code : null
}

export const httpClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
})

export const backendHttpClient = axios.create({
  baseURL: env.backendUrl,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
})

registerAuthSessionInterceptor(httpClient)
registerAuthSessionInterceptor(backendHttpClient)
