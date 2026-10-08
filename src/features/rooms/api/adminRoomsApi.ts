import axios from 'axios'
import { httpClient } from '@/shared/api/httpClient'
import type {
  Room,
  RoomFieldErrors,
  RoomPayload,
  RoomResponse,
  RoomsQuery,
  RoomsResponse,
} from '../types/room.types'
import { ROOM_FIELDS } from '../utils/roomValidation'

const ROOMS_ENDPOINT = '/admin/rooms'

export class RoomApiError extends Error {
  readonly status: number | null
  readonly fieldErrors: RoomFieldErrors

  constructor(
    message: string,
    status: number | null = null,
    fieldErrors: RoomFieldErrors = {},
  ) {
    super(message)
    this.name = 'RoomApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function mapRoomError(error: unknown): RoomApiError {
  if (!axios.isAxiosError(error))
    return new RoomApiError(
      'No se pudo completar la operación. Inténtalo nuevamente.',
    )
  const status = error.response?.status ?? null
  const data = error.response?.data as
    { message?: unknown; errors?: unknown } | undefined
  const fields: RoomFieldErrors = {}
  if (data?.errors && typeof data.errors === 'object') {
    const errors = data.errors as Record<string, unknown>
    for (const field of ROOM_FIELDS) {
      const messages = errors[field.name]
      if (Array.isArray(messages) && typeof messages[0] === 'string')
        fields[field.name] = messages[0]
    }
  }
  let message = 'No se pudo completar la operación. Inténtalo nuevamente.'
  if (status === null)
    message =
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.'
  else if (status === 403)
    message = 'No tienes permisos para realizar esta operación.'
  else if (status === 404)
    message = 'El aula solicitada no existe o ya no está disponible.'
  else if (status === 422)
    message = 'Revisa los campos indicados antes de continuar.'
  else if (status === 409)
    message =
      'Los datos entran en conflicto con otro registro. Revisa el código y el nombre del aula.'
  else if (status >= 500)
    message =
      'El servidor no pudo completar la operación. Inténtalo nuevamente.'
  if (
    (status === 409 || status === 422) &&
    typeof data?.message === 'string' &&
    data.message.trim()
  )
    message = data.message
  return new RoomApiError(message, status, fields)
}

function readRoom(response: RoomResponse, expectedId?: number): Room {
  const room = response?.data
  if (
    !room ||
    !Number.isSafeInteger(room.id) ||
    room.id <= 0 ||
    typeof room.code !== 'string' ||
    !['ACTIVE', 'INACTIVE'].includes(room.status) ||
    (expectedId !== undefined && room.id !== expectedId)
  ) {
    throw new RoomApiError(
      'El servidor devolvió una respuesta de aula inválida. Inténtalo nuevamente.',
    )
  }
  return room
}

export async function getAdminRoom(
  roomId: number,
  signal: AbortSignal,
): Promise<Room> {
  try {
    const response = await httpClient.get<RoomResponse>(
      `${ROOMS_ENDPOINT}/${roomId}`,
      { signal },
    )
    return readRoom(response.data, roomId)
  } catch (error) {
    if (error instanceof RoomApiError) throw error
    throw mapRoomError(error)
  }
}

export async function saveAdminRoom(
  payload: RoomPayload,
  roomId?: number,
): Promise<Room> {
  try {
    const response =
      roomId === undefined
        ? await httpClient.post<RoomResponse>(ROOMS_ENDPOINT, payload)
        : await httpClient.put<RoomResponse>(
            `${ROOMS_ENDPOINT}/${roomId}`,
            payload,
          )
    return readRoom(response.data, roomId)
  } catch (error) {
    if (error instanceof RoomApiError) throw error
    throw mapRoomError(error)
  }
}

export async function getAdminRooms(query: RoomsQuery, signal: AbortSignal) {
  const response = await httpClient.get<RoomsResponse>(ROOMS_ENDPOINT, {
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
