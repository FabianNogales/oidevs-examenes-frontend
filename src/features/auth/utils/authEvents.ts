export type AuthSessionEventReason = 'SESSION_REPLACED' | 'SESSION_EXPIRED'

export type AuthSessionEvent = {
  reason: AuthSessionEventReason
}

const AUTH_SESSION_EVENT = 'eida:auth-session-event'

export function emitAuthSessionEvent(event: AuthSessionEvent): void {
  window.dispatchEvent(
    new CustomEvent<AuthSessionEvent>(AUTH_SESSION_EVENT, {
      detail: event,
    }),
  )
}

export function subscribeToAuthSessionEvents(
  listener: (event: AuthSessionEvent) => void,
): () => void {
  const handler = (event: Event) => {
    if (event instanceof CustomEvent) {
      listener(event.detail as AuthSessionEvent)
    }
  }

  window.addEventListener(AUTH_SESSION_EVENT, handler)

  return () => window.removeEventListener(AUTH_SESSION_EVENT, handler)
}
