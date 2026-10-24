import { useActiveAcademicTerm } from '@/features/academic-terms/hooks/useActiveAcademicTerm'

/** Keep each profile's badge styles; HU24 owns the active-period source. */
export function ProfileActiveTermBadge({ className, label }: { className: string; label: string }) {
  const { state, reload } = useActiveAcademicTerm()
  return (
    <span className={className}>
      {label}:{' '}
      {!state ? <span role="status">Consultando…</span>
        : state.status === 'error' ? <>
          <span role="alert" title={state.message}>Información no disponible</span>{' '}
          <button type="button" onClick={reload}>Reintentar período</button>
        </>
          : state.term?.name ?? 'Sin período activo'}
    </span>
  )
}
