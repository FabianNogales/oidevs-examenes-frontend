import type {
  LocalEntry,
  OfflinePackage,
  OfflineStudent,
  StoredPackage,
} from '../types/offline.types'
import { record, UUID } from './offlineContract'

export function studentName(student: {
  first_names: string
  last_names: string
}) {
  return `${student.last_names}, ${student.first_names}`
}
export function searchOfflineStudents(
  students: OfflineStudent[],
  query: string,
) {
  const words = query
    .trim()
    .toLocaleLowerCase('es')
    .split(/\s+/)
    .filter(Boolean)
  return students.filter((student) => {
    const text = [
      student.first_names,
      student.last_names,
      student.sis_code,
      student.identity_number ?? '',
    ]
      .join(' ')
      .toLocaleLowerCase('es')
    return words.every((word) => text.includes(word))
  })
}
export function packageBlocker(
  stored: StoredPackage,
  now = Date.now(),
): string | null {
  if (stored.staleReason) return stored.staleReason
  const packet = stored.packet
  if (!['ACTIVE', 'SCHEDULED', 'IN_PROGRESS'].includes(packet.exam.status))
    return 'El estado conocido del examen no admite capturas.'
  if (now < Date.parse(packet.prepared_at))
    return 'El reloj del dispositivo es anterior a la preparación. Revisa la hora antes de continuar.'
  if (now >= Date.parse(packet.expires_at))
    return 'El paquete está vencido según la hora del dispositivo. Se conserva para sincronización y revisión.'
  if (now < Date.parse(packet.exam.entry_opens_at ?? ''))
    return 'El horario del examen aún no comenzó según el reloj del dispositivo.'
  return null
}
export function studentBlocker(
  student: OfflineStudent,
  entries: LocalEntry[],
): string | null {
  if (student.entry_status === 'REGISTERED')
    return 'El paquete ya informa un ingreso oficial registrado.'
  if (entries.some((entry) => entry.payload.student_id === student.student_id))
    return 'Este estudiante ya tiene un evento guardado en este dispositivo. Consulta su resultado en sincronización.'
  if (
    student.student_status !== 'ACTIVE' ||
    student.enrollment_status !== 'ACTIVE'
  )
    return 'El paquete no informa estudiante e inscripción activos.'
  if (student.eligibility_status !== 'ELIGIBLE')
    return 'El paquete no informa una habilitación ELIGIBLE vigente al descargar.'
  return null
}
export function provisionalQr(token: string, now = Date.now()): string {
  if (token.length > 4096)
    throw new Error('El QR excede el tamaño admitido por el servidor.')
  const parts = token.split('.')
  if (
    parts.length !== 3 ||
    parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
  )
    throw new Error('El contenido no tiene el formato QR de EIDA.')
  try {
    const decode = (part: string) =>
      JSON.parse(
        atob(
          part
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(Math.ceil(part.length / 4) * 4, '='),
        ),
      ) as unknown
    const header = record(decode(parts[0]))
    const claims = record(decode(parts[1]))
    if (
      header.alg !== 'HS256' ||
      header.typ !== 'JWT' ||
      Object.keys(claims).length !== 3 ||
      claims.v !== 2 ||
      typeof claims.jti !== 'string' ||
      !UUID.test(claims.jti) ||
      typeof claims.exp !== 'number' ||
      !Number.isSafeInteger(claims.exp)
    )
      throw new Error()
    if (claims.exp * 1000 <= now)
      throw new Error(
        'El QR parece vencido según la hora local. Su vigencia requiere revisión del servidor.',
      )
  } catch (error) {
    if (error instanceof Error && error.message.includes('parece vencido'))
      throw error
    throw new Error(
      'El contenido no corresponde al contrato QR v2 de EIDA. No se verificó su autenticidad.',
    )
  }
  return token
}
export function capturePayload(
  packet: OfflinePackage,
  studentId: number,
  method: 'MANUAL' | 'QR',
  qrToken?: string,
) {
  if (!packet.students.some((student) => student.student_id === studentId))
    throw new Error('El estudiante no pertenece a esta lista.')
  if (method === 'QR' && !qrToken)
    throw new Error('Escanea el QR antes de confirmar la identidad.')
  return {
    event_id: crypto.randomUUID(),
    student_id: studentId,
    method,
    captured_at: new Date().toISOString(),
    ...(method === 'QR' ? { qr_token: provisionalQr(qrToken ?? '') } : {}),
  }
}
export function formatOfflineTime(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(new Date(value))
}
