import type {
  EntryEligibilityStatus,
  EntryEnrollmentStatus,
  EntryRoomStatus,
  EntryStatus,
} from '../types/entryControl.types'
import type { Room } from '../types/exam.types'

export type EntryConditionDisplay = {
  label: string
  tone: 'positive' | 'negative' | 'pending' | 'neutral'
}

export function eligibilityDisplay(
  status: EntryEligibilityStatus,
): EntryConditionDisplay {
  if (status === 'ELIGIBLE') return { label: 'Habilitado', tone: 'positive' }
  if (status === 'INELIGIBLE')
    return { label: 'Inhabilitado', tone: 'negative' }
  return { label: 'Sin evaluar', tone: 'pending' }
}

export function enrollmentDisplay(
  status: EntryEnrollmentStatus,
): EntryConditionDisplay {
  if (status === 'ACTIVE') return { label: 'Activa', tone: 'positive' }
  if (status === 'INACTIVE') return { label: 'Inactiva', tone: 'negative' }
  return { label: 'Sin inscripción', tone: 'negative' }
}

export function roomDisplay(status: EntryRoomStatus): EntryConditionDisplay {
  if (status === 'MATCH') return { label: 'Correcto', tone: 'positive' }
  if (status === 'MISMATCH')
    return { label: 'No corresponde', tone: 'negative' }
  return { label: 'No aplica', tone: 'neutral' }
}

export function entryDisplay(status: EntryStatus): EntryConditionDisplay {
  if (status === 'REGISTERED') return { label: 'Registrado', tone: 'positive' }
  if (status === 'PENDING') return { label: 'Pendiente', tone: 'pending' }
  return { label: '—', tone: 'neutral' }
}

export function entryStudentName(student: {
  first_names: string
  last_names: string
}): string {
  return `${student.first_names} ${student.last_names}`.trim()
}

export function entryRoomLabel(room: Room): string {
  return `${room.code} — ${room.name}${room.location ? ` (${room.location})` : ''}`
}

export function formatEntryDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-BO')
}

export function formatEntryTimestamp(value?: string | null): string {
  if (!value) return 'No informado'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('es-BO', { hour12: false })
}
