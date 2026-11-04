import type { PortalEvent } from '../types'

export const CALENDAR_ZONE = 'America/La_Paz'
const parts = (date: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: CALENDAR_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )

export function boliviaDate(date = new Date()): string {
  const p = parts(date)
  return `${p.year}-${p.month}-${p.day}`
}

export function boliviaInput(iso: string, allDay = false): string {
  const date = new Date(iso)
  const p = parts(date)
  const day = `${p.year}-${p.month}-${p.day}`
  return allDay ? day : `${day}T${p.hour}:${p.minute}:${p.second}`
}

export function inputToIso(value: string, allDay: boolean): string {
  if (allDay) return `${value.slice(0, 10)}T00:00:00-04:00`
  const datetime = value.length === 16 ? `${value}:00` : value
  return `${datetime}-04:00`
}

export function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00-04:00`)
  date.setUTCDate(date.getUTCDate() + amount)
  return boliviaDate(date)
}

export function shiftMonth(month: string, amount: number): string {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, number - 1 + amount, 1, 12))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthInterval(month: string) {
  return { from: `${month}-01`, to: shiftDay(`${shiftMonth(month, 1)}-01`, -1) }
}

export function monthDays(month: string) {
  const { from, to } = monthInterval(month)
  const weekday = new Date(`${from}T12:00:00-04:00`).getUTCDay()
  const offset = (weekday + 6) % 7
  const count = Math.ceil((offset + Number(to.slice(-2))) / 7) * 7
  return Array.from({ length: count }, (_, index) =>
    shiftDay(from, index - offset),
  )
}

export function eventsOnDay(events: PortalEvent[], day: string) {
  const start = Date.parse(`${day}T00:00:00-04:00`)
  const end = Date.parse(`${shiftDay(day, 1)}T00:00:00-04:00`)
  return events.filter(
    (event) =>
      Date.parse(event.starts_at) < end && Date.parse(event.ends_at) > start,
  )
}

export function monthLabel(month: string) {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: CALENDAR_ZONE,
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${month}-01T12:00:00-04:00`))
}

export function eventDateLabel(event: PortalEvent) {
  const format = (iso: string, allDay: boolean) =>
    new Intl.DateTimeFormat('es-BO', {
      timeZone: CALENDAR_ZONE,
      dateStyle: 'medium',
      ...(allDay ? {} : { timeStyle: 'short' as const }),
    }).format(new Date(iso))
  if (event.all_day) {
    const first = boliviaDate(new Date(event.starts_at))
    const last = shiftDay(boliviaDate(new Date(event.ends_at)), -1)
    return `${format(event.starts_at, true)}${first === last ? '' : ` – ${format(`${last}T00:00:00-04:00`, true)}`} · Día completo`
  }
  return `${format(event.starts_at, false)} – ${format(event.ends_at, false)}`
}
