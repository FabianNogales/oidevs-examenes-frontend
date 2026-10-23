export type ExamFormValues = {
  name: string
  exam_date: string
  start_time: string
  duration_minutes: string
  evaluation_type: string
  room_id: string
  rules: string
}

export function getLocalDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

// Creation sends institutional wall-clock values to Laravel. Only the server
// decides whether they are still in the future, independently of device clocks.
export function validateCreateExamForm(
  values: ExamFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!values.name.trim()) errors.name = 'El nombre del examen es obligatorio.'
  else if (values.name.trim().length > 255)
    errors.name = 'El nombre no puede superar los 255 caracteres.'
  if (!['partial', 'final', 'makeup'].includes(values.evaluation_type)) {
    errors.evaluation_type = 'Debes seleccionar el tipo de evaluación.'
  }
  if (!values.exam_date) errors.exam_date = 'La fecha es obligatoria.'
  if (!values.start_time) errors.start_time = 'La hora es obligatoria.'
  const date = new Date(`${values.exam_date}T00:00:00Z`)
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(values.exam_date) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === values.exam_date
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(values.start_time)
  if (values.exam_date && !validDate)
    errors.exam_date = 'Selecciona una fecha válida.'
  if (values.start_time && !validTime)
    errors.start_time = 'Selecciona una hora válida.'
  const duration = Number(values.duration_minutes)
  if (
    !Number.isSafeInteger(duration) ||
    duration <= 0 ||
    duration > 2147483647
  ) {
    errors.duration_minutes =
      'La duración debe ser un número entero entre 1 y 2147483647 minutos.'
  }
  if (
    !/^[1-9]\d*$/.test(values.room_id) ||
    !Number.isSafeInteger(Number(values.room_id))
  ) {
    errors.room_id = 'Debes seleccionar un ambiente.'
  }
  return errors
}

// Preserve the existing local precheck for editing and rescheduling.
export function validateExamForm(
  values: ExamFormValues,
  now = new Date(),
): Record<string, string> {
  const errors = validateCreateExamForm(values)
  if (!errors.exam_date && !errors.start_time) {
    const scheduledAt = new Date(
      `${values.exam_date}T${values.start_time}:00-04:00`,
    )
    if (scheduledAt.getTime() <= now.getTime()) {
      const field =
        values.exam_date < getLocalDate(now) ? 'exam_date' : 'start_time'
      errors[field] = 'La fecha y hora del examen no pueden estar en el pasado.'
    }
  }
  return errors
}
