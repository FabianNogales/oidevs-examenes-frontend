import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type { RoomsQuery, RoomsResponse } from '../types/room.types'

export async function getAdminRooms(query: RoomsQuery, signal: AbortSignal) {
  const response = await httpClient.get<RoomsResponse>('/admin/rooms', {
    params: {
      page: query.page,
      per_page: 15,
      search: query.search || undefined,
      status: query.status || undefined,
    },
    signal,
  })
  const { data, meta } = response.data
  if (!Array.isArray(data) || !meta || !Number.isInteger(meta.last_page)) {
    throw new Error('Invalid rooms response')
  }
  return response.data
}

export function getRoomsErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 403) return 'No tienes permisos para consultar las aulas.'
    if (status === 404 || status === 501) {
      return 'La gestión de aulas aún no está disponible en el servidor. Inténtalo cuando se habilite el servicio.'
    }
    if (!error.response)
      return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.'
  }
  return 'No se pudieron cargar las aulas. Inténtalo nuevamente.'
}
