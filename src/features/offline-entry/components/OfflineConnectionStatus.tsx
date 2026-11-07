import shared from './OfflineShared.module.css'

export function OfflineConnectionStatus({ online }: { online: boolean }) {
  return (
    <span
      className={shared.badge}
      data-status={online ? 'ACCEPTED' : 'PENDING'}
      role="status"
    >
      {online ? 'Red disponible' : 'Sin conexión'}
    </span>
  )
}