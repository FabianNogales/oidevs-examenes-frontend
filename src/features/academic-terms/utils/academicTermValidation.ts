import type {
  AcademicTermFieldErrors,
  AcademicTermPayload,
  CreateAcademicTermPayload,
} from '../types/academicTerm.types'
import { isAcademicTermDate } from './academicTermDate'

export function validateAcademicTerm(
  values: AcademicTermPayload | CreateAcademicTermPayload,
): AcademicTermFieldErrors {
  const errors: AcademicTermFieldErrors = {}
  const name = values.name.trim()
  const length = Array.from(name).length
  if (!name) errors.name = 'Ingresa el nombre del periodo.'
  else if (length < 2 || length > 255)
    errors.name = 'El nombre debe tener entre 2 y 255 caracteres.'
  else if (!/[\p{L}\p{N}]/u.test(name) || /\p{Cc}/u.test(name))
    errors.name =
      'Usa un nombre con letras o números y sin caracteres de control.'
  for (const field of ['start_date', 'end_date'] as const) {
    if (!values[field])
      errors[field] =
        field === 'start_date'
          ? 'Selecciona la fecha de inicio.'
          : 'Selecciona la fecha de fin.'
    else if (!isAcademicTermDate(values[field]))
      errors[field] = 'Ingresa una fecha válida.'
  }
  if (
    !errors.start_date &&
    !errors.end_date &&
    values.end_date < values.start_date
  )
    errors.end_date =
      'La fecha de fin no puede ser anterior a la fecha de inicio.'
  if ('status' in values && !['ACTIVE', 'INACTIVE'].includes(values.status))
    errors.status = 'Selecciona un estado válido.'
  return errors
}
