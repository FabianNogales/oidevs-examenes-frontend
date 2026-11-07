import type { AuthenticatedUser } from '@/features/auth/types/auth'

export type OfflineIdentity = {
  ownerId: number
  displayName: string
  verifiedAt: number
  contextId: string
}
const KEY = 'eida.offline.identity.v1'
const INVALIDATION = 'eida.offline.invalidate.v1'
const CHANGE = 'eida:offline-identity'
const MAX_CONTINUITY = 24 * 60 * 60 * 1000

function notifyIdentityChange(): void {
  try {
    window.dispatchEvent(new Event(CHANGE))
  } catch {
    /* Local continuity must not interrupt the existing online auth flow. */
  }
}

export function readOfflineIdentity(): OfflineIdentity | null {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return null
    const identity = raw as Partial<OfflineIdentity>
    if (
      !Number.isSafeInteger(identity.ownerId) ||
      (identity.ownerId ?? 0) < 1 ||
      typeof identity.displayName !== 'string' ||
      typeof identity.contextId !== 'string' ||
      typeof identity.verifiedAt !== 'number' ||
      Date.now() < identity.verifiedAt ||
      Date.now() - identity.verifiedAt >= MAX_CONTINUITY
    )
      return null
    return identity as OfflineIdentity
  } catch {
    return null
  }
}

export function rememberOfflineIdentity(user: AuthenticatedUser): void {
  if (user.status !== 'ACTIVE' || user.must_change_password) {
    invalidateOfflineIdentity()
    return
  }
  try {
    const previous = readOfflineIdentity()
    const identity: OfflineIdentity = {
      ownerId: user.id,
      displayName: user.display_name,
      verifiedAt: Date.now(),
      contextId:
        previous?.ownerId === user.id
          ? previous.contextId
          : crypto.randomUUID(),
    }
    sessionStorage.setItem(KEY, JSON.stringify(identity))
    notifyIdentityChange()
  } catch {
    /* The online app remains usable; local access fails closed. */
  }
}

export function invalidateOfflineIdentity(broadcast = true): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* Identity reads also fail closed. */
  }
  notifyIdentityChange()
  if (broadcast) {
    try {
      localStorage.setItem(INVALIDATION, crypto.randomUUID())
      localStorage.removeItem(INVALIDATION)
    } catch {
      /* Storage can be disabled. */
    }
  }
}

export function assertOfflineOwner(
  ownerId: number,
  contextId?: string,
): OfflineIdentity {
  const identity = readOfflineIdentity()
  if (
    !identity ||
    identity.ownerId !== ownerId ||
    (contextId !== undefined && identity.contextId !== contextId)
  )
    throw new Error(
      'El contexto de la cuenta cambió. Inicia sesión con el responsable de estos datos.',
    )
  return identity
}

export function subscribeOfflineIdentity(listener: () => void): () => void {
  const changed = (event: StorageEvent) => {
    if (event.key === INVALIDATION) {
      invalidateOfflineIdentity(false)
      listener()
    }
  }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', changed)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', changed)
  }
}

// Browsers can copy sessionStorage into opener-created tabs. Do not resume that inherited context offline.
export function discardInheritedOfflineIdentity(): void {
  if (window.opener) invalidateOfflineIdentity(false)
}
