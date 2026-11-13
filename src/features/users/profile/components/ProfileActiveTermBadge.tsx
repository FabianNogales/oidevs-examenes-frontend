import { Calendar, RotateCcw } from 'lucide-react'
import { useActiveAcademicTerm } from '@/features/academic-terms/hooks/useActiveAcademicTerm'
import { Badge, Button, Icon, Spinner } from '@/shared/components/ui/index'

/** Keep each profile's badge styles; HU24 owns the active-period source. */
export function ProfileActiveTermBadge({
  className,
  label,
}: {
  className: string
  label: string
}) {
  const { state, reload } = useActiveAcademicTerm()
  return (
    <Badge
      tone="info"
      className={className}
      icon={<Icon icon={Calendar} size="sm" />}
    >
      {label}:{' '}
      {!state ? (
        <span role="status">
          <Spinner size="sm" label="Consultando…" /> Consultando…
        </span>
      ) : state.status === 'error' ? (
        <>
          <span role="alert" title={state.message}>
            Información no disponible
          </span>{' '}
          <Button type="button" variant="ghost" size="sm" onClick={reload}>
            <Icon icon={RotateCcw} size="sm" />
            <span>Reintentar período</span>
          </Button>
        </>
      ) : (
        state.term?.name ?? 'Sin período activo'
      )}
    </Badge>
  )
}
