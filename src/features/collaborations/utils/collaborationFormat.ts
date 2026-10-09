export function formatAssignmentDate(value?: string | null): string {
  if (!value) return 'No informada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-BO')
}

export function formatAssignmentDateCompact(value?: string | null): string {
  if (!value) return 'No informada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = date.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return `${day} ${time}`
}

export function normalizeCollaborationSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
