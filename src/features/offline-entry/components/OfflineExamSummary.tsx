import type { OfflinePackage } from '../types/offline.types'
import { formatOfflineTime } from '../utils/offlineRules'
import styles from './OfflineEntry.module.css'

export function OfflineExamSummary({ packet }: { packet: OfflinePackage }) {
  return (
    <section className={styles.panel} aria-label="Examen y lista descargada">
      <div className={styles.toolbar}>
        <div>
          <p className={styles.eyebrow}>{packet.exam.subject_name}</p>
          <h2>{packet.exam.name}</h2>
        </div>
        <span className={styles.badge}>
          Lista {packet.list_id} · v{packet.version}
        </span>
      </div>
      <dl className={styles.details}>
        <div>
          <dt>Ambiente</dt>
          <dd>
            {packet.exam.room?.code} · {packet.exam.room?.name}
          </dd>
        </div>
        <div>
          <dt>Rango de apellidos</dt>
          <dd>
            {packet.surname_range.from === null
              ? 'Lista vacía'
              : `${packet.surname_range.from} — ${packet.surname_range.to}`}
          </dd>
        </div>
        <div>
          <dt>Inicio · hora de Bolivia</dt>
          <dd>
            {formatOfflineTime(
              packet.exam.entry_opens_at ?? packet.prepared_at,
            )}
          </dd>
        </div>
        <div>
          <dt>Vigente hasta · hora de Bolivia</dt>
          <dd>{formatOfflineTime(packet.expires_at)}</dd>
        </div>
      </dl>
    </section>
  )
}
