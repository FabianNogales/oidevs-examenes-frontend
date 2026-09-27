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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function validateExamForm(
  values: ExamFormValues,
  now = new Date(),
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!values.name.trim()) errors.name = 'El nombre del examen es obligatorio.'
  if (!['partial', 'final', 'makeup'].includes(values.evaluation_type)) {
    errors.evaluation_type = 'Debes seleccionar el tipo de evaluación.'
  }
  if (!values.exam_date) errors.exam_date = 'La fecha es obligatoria.'
  if (!values.start_time) errors.start_time = 'La hora es obligatoria.'
  if (values.exam_date && values.start_time) {
    // Los campos del formulario representan fecha y hora locales, sin conversión a UTC.
    const scheduledAt = new Date(`${values.exam_date}T${values.start_time}`)
    if (Number.isNaN(scheduledAt.getTime())) {
      errors.exam_date = 'Selecciona una fecha y hora válidas.'
    } else if (scheduledAt.getTime() < now.getTime()) {
      const field =
        values.exam_date < getLocalDate(now) ? 'exam_date' : 'start_time'
      errors[field] = 'La fecha y hora del examen no pueden estar en el pasado.'
    }
  }
  const duration = Number(values.duration_minutes)
  if (!Number.isInteger(duration) || duration <= 0) {
    errors.duration_minutes =
      'La duración debe ser un número entero mayor a 0 minutos.'
  }
  if (!values.room_id) errors.room_id = 'Debes seleccionar un ambiente.'
  return errors
}
