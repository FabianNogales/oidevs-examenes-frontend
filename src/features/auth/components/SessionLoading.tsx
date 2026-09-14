export function SessionLoading() {
  return (
    <main className="session-loading" aria-live="polite">
      <span className="session-loading__spinner" aria-hidden="true" />
      <span>Comprobando sesión...</span>
    </main>
  )
}
