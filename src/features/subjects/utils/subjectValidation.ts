import type {
  SubjectFieldErrors,
  SubjectPayload,
} from '../types/adminSubject.types'

export function validateSubject(payload: SubjectPayload): SubjectFieldErrors {
  const errors: SubjectFieldErrors = {}
  if (!payload.code) errors.code = 'Ingresa el código de la materia.'
  else if (
    payload.code.length > 50 ||
    !/^[A-Z0-9][A-Z0-9._-]*$/.test(payload.code)
  )
    errors.code =
      'Usa hasta 50 letras, números, puntos, guiones o guiones bajos.'
  if (
    payload.name.length < 2 ||
    payload.name.length > 255 ||
    !/\p{L}/u.test(payload.name) ||
    /\p{Cc}/u.test(payload.name)
  )
    errors.name =
      'Ingresa un nombre de 2 a 255 caracteres que contenga letras y no incluya caracteres de control.'
  if (
    !payload.career_ids.length ||
    payload.career_ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
  )
    errors.career_ids = 'Selecciona al menos una carrera.'
  return errors
}
