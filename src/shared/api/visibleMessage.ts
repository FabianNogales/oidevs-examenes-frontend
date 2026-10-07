const messages: Record<string, string> = {
  'Incorrect credentials': 'Credenciales incorrectas.',
  'Invalid credentials': 'Correo, código institucional/SIS o contraseña incorrectos.',
  'These credentials do not match our records.': 'Correo, código institucional/SIS o contraseña incorrectos.',
  'Unauthenticated.': 'La sesión no es válida o ha expirado.',
  'Unauthenticated': 'La sesión no es válida o ha expirado.',
  'Unauthorized': 'La sesión no es válida o ha expirado.',
  'Forbidden - Insufficient permissions': 'No tienes permisos para realizar esta operación.',
  'Forbidden - Action requires higher authorization level': 'No tienes permisos para realizar esta operación.',
  'Forbidden - You do not own this course offering.': 'No tienes autorización para operar sobre esta materia.',
  'Student not found in the institutional registry.': 'El estudiante no se encuentra registrado en el padrón institucional.',
  'The student is already enrolled in this course offering.': 'El estudiante ya se encuentra inscrito en esta materia.',
  'Already enrolled in this course offering': 'El estudiante ya se encuentra inscrito en esta materia.',
  'Student not found in institutional registry': 'El estudiante no se encuentra registrado en el padrón institucional.',
  'Missing sisCode column data': 'Falta el SIS en la columna sisCode.',
  'Duplicate sisCode in CSV file': 'El SIS está repetido en el archivo CSV.',
  'A critical error occurred.': 'No se pudo procesar la operación. Inténtalo nuevamente.',
  'A critical error occurred while processing the file.': 'No se pudo procesar el archivo CSV. Inténtalo nuevamente.',
  'Student enrolled successfully.': 'Estudiante agregado correctamente.',
  'Exam scheduled successfully.': 'Examen programado correctamente.',
  'Session revoked successfully': 'Sesión cerrada correctamente.',
  'The given data was invalid.': 'Los datos enviados no son válidos.',
  'Server Error': 'Error del servidor. Inténtalo nuevamente.',
  'Too Many Attempts.': 'Demasiados intentos. Inténtalo más tarde.',
  'CSRF token mismatch.': 'La sesión expiró. Inténtalo nuevamente.',
  'The password is incorrect.': 'La contraseña es incorrecta.',
  'The provided password does not match your current password.': 'La contraseña actual es incorrecta.',
}

export function translateVisibleMessage(message: string): string {
  if (messages[message]) return messages[message]
  const summary = /^(.*\.) \(and (\d+) more errors?\)$/.exec(message)
  if (summary) return `${translateVisibleMessage(summary[1])} (${summary[2]} errores adicionales)`

  const validation = /^The (.+?) field (.+)\.$/.exec(message)
    ?? /^The (.+?) (confirmation does not match|has already been taken)\.$/.exec(message)
  if (!validation) {
    if (/^The selected .+ is invalid\.$/.test(message)) return 'La opción seleccionada no es válida.'
    return message
  }
  const fields: Record<string, string> = {
    identifier: 'identificador', password: 'contraseña',
    current_password: 'contraseña actual', 'current password': 'contraseña actual',
    email: 'correo', file: 'archivo CSV', sisCode: 'SIS', 'sis code': 'SIS',
    institutional_code: 'código docente', 'institutional code': 'código docente',
    identity_number: 'CI', 'identity number': 'CI',
    first_names: 'nombres', 'first names': 'nombres', last_names: 'apellidos', 'last names': 'apellidos',
    name: 'nombre del examen', exam_date: 'fecha', 'exam date': 'fecha',
    start_time: 'hora', 'start time': 'hora', duration_minutes: 'duración', 'duration minutes': 'duración',
    room_id: 'ambiente', 'room id': 'ambiente', evaluation_type: 'tipo de evaluación', 'evaluation type': 'tipo de evaluación',
    rules: 'normas',
  }
  const label = fields[validation[1]]
  if (!label) return message
  const detail = validation[2]
  if (detail === 'is required') return `El campo ${label} es obligatorio.`
  if (detail === 'must be a string') return `El campo ${label} debe ser texto.`
  if (detail === 'must be an integer') return `El campo ${label} debe ser un número entero.`
  if (detail === 'must be a valid email address') return 'Ingresa un correo válido.'
  if (detail === 'must be a valid date') return 'Ingresa una fecha válida.'
  if (detail === 'confirmation does not match') return 'La confirmación de contraseña no coincide.'
  if (detail === 'has already been taken') return `El campo ${label} ya está registrado.`
  if (detail === 'must be a file') return 'Selecciona un archivo CSV válido.'
  if (detail.startsWith('must be a file of type:')) return 'Selecciona un archivo CSV válido.'
  const limit = /^must (not be greater than|be at least) (\d+) (characters|kilobytes)$/.exec(detail)
  if (limit) return `El campo ${label} ${limit[1] === 'be at least' ? 'debe tener al menos' : 'no debe superar'} ${limit[2]} ${limit[3] === 'characters' ? 'caracteres' : 'kilobytes'}.`
  if (detail.startsWith('must be a date after or equal to')) return 'La fecha del examen debe ser hoy o posterior.'
  if (detail.startsWith('must match the format')) return `El formato del campo ${label} no es válido.`
  if (detail.startsWith('must be greater than')) return `El campo ${label} debe ser mayor que cero.`
  return message
}

export function importStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    VALID: 'Listo para importar',
    ADDED: 'Agregado correctamente',
    DUPLICATE: 'Duplicado',
    NOT_FOUND: 'No encontrado',
    INVALID: 'Inválido',
  }
  return labels[status] ?? 'Resultado no reconocido'
}
