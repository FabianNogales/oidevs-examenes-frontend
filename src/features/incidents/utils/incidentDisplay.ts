export function formatIncidentDate(value: string): string {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'long',
    timeStyle: 'medium',
    timeZone: 'America/La_Paz',
  }).format(new Date(value))
}

// State labels describe the report only, never a disciplinary decision.
export function incidentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    REPORTED: 'Reportada',
    REGISTERED: 'Registrada',
    OPEN: 'Abierta',
    UNDER_REVIEW: 'En revisión',
    RESOLVED: 'Resuelta',
    CLOSED: 'Cerrada',
  }
  return labels[status] ?? 'Estado no reconocido'
}
