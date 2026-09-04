import { httpClient } from '@/shared/api/httpClient'
import type { HealthStatusResponse } from '@/features/health/types/health'

export async function getHealthStatus(): Promise<HealthStatusResponse> {
  const response = await httpClient.get<HealthStatusResponse>('/health')

  return response.data
}
