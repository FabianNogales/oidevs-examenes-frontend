import type {
  Room,
  RoomField,
  RoomFieldErrors,
  RoomFormValues,
  RoomPayload,
} from '../types/room.types'

export const ROOM_FIELDS: {
  name: RoomField
  label: string
  maxLength: number
  required?: boolean
  multiline?: boolean
}[] = [
  { name: 'code', label: 'Código', maxLength: 255, required: true },
  { name: 'name', label: 'Nombre', maxLength: 255, required: true },
  { name: 'location', label: 'Ubicación', maxLength: 255 },
  { name: 'floor', label: 'Piso', maxLength: 50 },
  { name: 'capacity', label: 'Capacidad', maxLength: 10 },
  {
    name: 'description',
    label: 'Descripción',
    maxLength: 1000,
    multiline: true,
  },
]

export function getRoomFormValues(room?: Room): RoomFormValues {
  return {
    code: room?.code ?? '',
    name: room?.name ?? '',
    location: room?.location ?? '',
    description: room?.description ?? '',
    capacity: room?.capacity == null ? '' : String(room.capacity),
    floor: room?.floor ?? '',
  }
}

export function validateRoomForm(values: RoomFormValues): RoomFieldErrors {
  const errors: RoomFieldErrors = {}
  for (const field of ROOM_FIELDS) {
    const value = values[field.name].trim()
    if (field.required && !value)
      errors[field.name] =
        `El campo ${field.label.toLowerCase()} es obligatorio.`
    else if (value.length > field.maxLength)
      errors[field.name] = `Usa como máximo ${field.maxLength} caracteres.`
    else if (
      Array.from(value).some((character) => {
        const code = character.charCodeAt(0)
        return (
          (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
          code === 127
        )
      })
    )
      errors[field.name] = 'El campo contiene caracteres no válidos.'
    else if (!field.multiline && /[\r\n\t]/u.test(value))
      errors[field.name] = 'Ingresa el valor en una sola línea.'
  }
  const capacity = values.capacity.trim()
  if (
    capacity &&
    (!/^\d+$/u.test(capacity) ||
      !Number.isSafeInteger(Number(capacity)) ||
      Number(capacity) <= 0 ||
      Number(capacity) > 2147483647)
  ) {
    errors.capacity =
      'Ingresa una capacidad válida como número entero positivo.'
  }
  return errors
}

export function getRoomPayload(values: RoomFormValues): RoomPayload {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    location: values.location.trim() || null,
    description: values.description.trim() || null,
    floor: values.floor.trim() || null,
    capacity: values.capacity.trim() ? Number(values.capacity.trim()) : null,
  }
}
