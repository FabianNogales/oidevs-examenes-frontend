import type { HistoricalPhotoFieldErrors } from '@/features/students/types/adminStudent.types';

export const HISTORICAL_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'
export const HISTORICAL_PHOTO_MAX_BYTES = 5 * 1024 * 1024

export function validateHistoricalPhoto(
  photo: File | null,
  revision: number,
  correction: boolean,
  reason: string,
): HistoricalPhotoFieldErrors {
  const errors: HistoricalPhotoFieldErrors = {}
  if (!photo) errors.photo = ['Selecciona una fotografía.']
  else if (!HISTORICAL_PHOTO_ACCEPT.split(',').includes(photo.type))
    errors.photo = ['Selecciona un archivo JPEG, PNG o WebP.']
  else if (photo.size > HISTORICAL_PHOTO_MAX_BYTES)
    errors.photo = ['La fotografía no debe superar 5 MB.']
  if (
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    (!correction && revision !== 0)
  ) {
    errors.revision = [
      'La revisión no es válida. Recarga el detalle del estudiante.',
    ]
  }
  if (correction && !reason.trim())
    errors.reason = ['Indica el motivo de la corrección.']
  else if (correction && reason.trim().length > 500)
    errors.reason = ['El motivo no debe superar 500 caracteres.']
  return errors
}
