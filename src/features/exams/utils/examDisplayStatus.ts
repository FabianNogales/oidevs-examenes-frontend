type ExamSchedule = {
  status?: string | null
  exam_date?: string | null
  start_time?: string | null
  duration_minutes?: number | null
}

/** Display only: permissions and persisted states remain controlled by the API. */
export function hasExamEnded(exam: ExamSchedule, now = Date.now()): boolean {
  if (!exam.exam_date || !exam.start_time || !exam.duration_minutes)
    return false
  const start = Date.parse(`${exam.exam_date}T${exam.start_time}-04:00`)
  return Number.isFinite(start) && now >= start + exam.duration_minutes * 60_000
}

export function examDisplayStatus(
  exam: ExamSchedule,
  now = Date.now(),
): string {
  if (
    ['SCHEDULED', 'ACTIVE'].includes(exam.status ?? '') &&
    hasExamEnded(exam, now)
  ) {
    return 'EXPIRED'
  }
  if (exam.status === 'IN_PROGRESS' && hasExamEnded(exam, now))
    return 'TIME_ENDED'
  return exam.status ?? ''
}

const labels: Record<string, string> = {
  'APOYO EN EXAMEN': 'Apoyo en examen',
  SCHEDULED: 'Programado',
  ACTIVE: 'Programado',
  IN_PROGRESS: 'En curso',
  EXPIRED: 'Vencido',
  TIME_ENDED: 'Horario concluido',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Finalizado',
  FINISHED: 'Finalizado',
}

export function examStatusLabel(status: string): string {
  return labels[status] ?? 'Estado no disponible'
}
