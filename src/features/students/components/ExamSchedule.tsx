interface ExamScheduleProps {
  scheduledAt: string
}

export function ExamSchedule({ scheduledAt }: ExamScheduleProps) {
  // The contract supplies local exam time without an offset. Do not shift it to UTC.
  const dateTime = scheduledAt.replace(' ', 'T')
  const date = new Date(dateTime)
  const label = Number.isNaN(date.getTime())
    ? scheduledAt
    : new Intl.DateTimeFormat('es-BO', {
        dateStyle: 'long',
        timeStyle: 'short',
        hour12: false,
      }).format(date)

  return <time dateTime={dateTime}>{label}</time>
}
