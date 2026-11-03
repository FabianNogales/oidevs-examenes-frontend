import {
  getApiErrorMessage,
  getApiFieldErrors,
  getRequestStatus,
} from '@/features/auth/utils/apiErrors'

export type PortalPage<T> = {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
export type PortalQuery = { page: number; per_page?: number; search?: string }

export function portalError(cause: unknown) {
  const status = getRequestStatus(cause)
  const fields = status === 422 ? getApiFieldErrors(cause) : {}
  const messages: Record<number, string> = {
    401: 'Tu sesión ha caducado. Inicia sesión nuevamente.',
    403: 'No tienes permisos para realizar esta operación.',
    404: 'El contenido no existe o ya no está disponible.',
    409: 'El contenido fue modificado por otro usuario. Recarga la información antes de continuar.',
  }
  return {
    status,
    fields,
    message:
      status === 422
        ? (Object.values(fields)[0] ??
          getApiErrorMessage(cause) ??
          'Revisa los datos ingresados.')
        : (messages[status ?? 0] ??
          'No se pudo completar la operación. Inténtalo nuevamente.'),
  }
}

export function portalPagination<T>(result: PortalPage<T>) {
  const { meta, data } = result
  return {
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    total: meta.total,
    from: data.length ? (meta.current_page - 1) * meta.per_page + 1 : 0,
    to: data.length ? (meta.current_page - 1) * meta.per_page + data.length : 0,
  }
}

export function publicationDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Sin publicar'
}
