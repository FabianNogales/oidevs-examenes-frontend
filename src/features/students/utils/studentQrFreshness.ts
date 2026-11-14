import type { StudentExam } from '@/features/students/types/studentQr'

export const EXAMS_REFRESH_MS = 60_000

/** Display invalidation only. Authorization and JWT verification remain on the server. */
export function qrDisplayClaims(token: string): { version: number; jti: string | null; expiresAt: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims: unknown = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    if (!claims || typeof claims !== 'object' || !('exp' in claims) || !('v' in claims)) return null
    const exp = claims.exp
    if (typeof exp !== 'number' || !Number.isSafeInteger(exp) || exp <= 0 ||
      exp > 253402300799 || typeof claims.v !== 'number') return null
    const jti = 'jti' in claims && typeof claims.jti === 'string' && claims.jti ? claims.jti : null
    return { version: claims.v, jti, expiresAt: exp * 1000 }
  } catch {
    return null
  }
}

export function qrExpiresAt(token: string): number | null {
  return qrDisplayClaims(token)?.expiresAt ?? null
}

export function nextExamsRefresh(exams: readonly StudentExam[], now: number): number {
  let delay = EXAMS_REFRESH_MS
  for (const exam of exams) {
    // The API supplies La Paz local time. This timer only requests a new server decision.
    const boundary = exam.qr_status === 'UPCOMING'
      ? Date.parse(exam.scheduled_at.replace(' ', 'T') + '-04:00') - 24 * 60 * 60 * 1000
      : exam.qr_status === 'AVAILABLE' && exam.token ? qrExpiresAt(exam.token) : null
    if (boundary !== null && Number.isFinite(boundary) && boundary > now) {
      delay = Math.min(delay, boundary - now)
    }
  }
  return delay
}
