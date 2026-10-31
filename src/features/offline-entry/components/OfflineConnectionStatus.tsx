import styles from './OfflineEntry.module.css'

export function OfflineConnectionStatus({ online }: { online: boolean }) {
  return (
    <span className={styles.badge} role="status">
      {online ? 'Red disponible' : 'Sin conexión'}
    </span>
  )
}
