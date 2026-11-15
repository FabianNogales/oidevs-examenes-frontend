import type { ProfilePhotoRecord } from '../types/entityProfile.types'

export interface ProfilePhotoSource {
  url: string | null | undefined
  revision?: number
}

export interface ProfilePhotoHistorySources {
  /** Fotografía institucional registrada por administración (siempre la primera) */
  institutional?: ProfilePhotoSource | null
  /** Fotografía de perfil vigente */
  current?: ProfilePhotoSource | null
  /** Fotografías anteriores, de la más reciente a la más antigua */
  previous?: readonly ProfilePhotoSource[]
}

const hasUrl = (photo?: ProfilePhotoSource | null): photo is ProfilePhotoSource =>
  Boolean(photo?.url?.trim())

/**
 * Normaliza las fotografías disponibles de una entidad en un historial ordenado:
 * institucional primero, luego la actual y finalmente las anteriores.
 * Responsabilidad única: transformar datos de origen en registros de presentación.
 */
export function buildProfilePhotoHistory({
  institutional,
  current,
  previous = [],
}: ProfilePhotoHistorySources): ProfilePhotoRecord[] {
  const records: ProfilePhotoRecord[] = []

  if (hasUrl(institutional)) {
    records.push({
      id: 'institutional',
      url: institutional.url ?? null,
      revision: institutional.revision,
      status: 'INSTITUTIONAL',
    })
  }

  if (hasUrl(current)) {
    records.push({
      id: 'current',
      url: current.url ?? null,
      revision: current.revision,
      status: 'CURRENT',
    })
  }

  previous.forEach((photo, index) => {
    if (!hasUrl(photo)) return
    records.push({
      id: `previous-${index}`,
      url: photo.url ?? null,
      revision: photo.revision,
      status: 'PREVIOUS',
    })
  })

  return records
}
