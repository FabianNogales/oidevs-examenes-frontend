import { useState } from 'react'
import type { useOfflineSync } from '../hooks/useOfflineSync'
import type { LocalEntry, StoredPackage } from '../types/offline.types'
import { formatOfflineTime, studentName } from '../utils/offlineRules'
import styles from './OfflineEntry.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

const labels: Record<LocalEntry['status'], string> = {
  PENDING: 'Pendiente de envío',
  ACCEPTED: 'Aceptado',
  DUPLICATE: 'Duplicado',
  CONFLICT: 'Necesita revisión',
  REJECTED: 'Rechazado',
}
const descriptions: Record<LocalEntry['status'], string> = {
  PENDING: 'Ingreso guardado en este dispositivo. Pendiente de sincronización.',
  ACCEPTED: 'Ingreso sincronizado exitosamente.',
  DUPLICATE: 'El estudiante ya tiene un ingreso registrado.',
  CONFLICT: 'El registro necesita revisión.',
  REJECTED: 'El registro fue rechazado.',
}

export function OfflineSyncPanel({
  entries,
  packages,
  sync,
  canRequest,
}: {
  entries: LocalEntry[]
  packages: StoredPackage[]
  sync: ReturnType<typeof useOfflineSync>
  canRequest: boolean
}) {
  const [filter, setFilter] = useState('ALL')
  const [limit, setLimit] = useState(25)
  const pending = entries.filter((entry) => entry.status === 'PENDING').length
  const visible = entries
    .filter((entry) => filter === 'ALL' || entry.status === filter)
    .toReversed()
  return (
    <section aria-labelledby="offline-sync-title">
      <div className={styles.panel}>
        <p className={styles.eyebrow}>HU37 · Confirmación del servidor</p>
        <h2 id="offline-sync-title">Sincronización de ingresos</h2>
        <p>
          Se envían únicamente eventos pendientes, conservando sus UUID y
          paquetes originales. Cada resultado se guarda por separado.
        </p>
        <div className={styles.metrics}>
          {(Object.keys(labels) as LocalEntry['status'][]).map((status) => (
            <div className={styles.metric} key={status}>
              <strong>
                {entries.filter((entry) => entry.status === status).length}
              </strong>
              <span>{labels[status]}</span>
            </div>
          ))}
        </div>
        <button
          className={buttons.primaryButton}
          disabled={!canRequest || sync.busy || pending === 0}
          onClick={() => void sync.synchronize()}
        >
          {sync.busy
            ? `Sincronizando… ${sync.progress} procesados`
            : `Sincronizar ahora${pending ? ` (${pending})` : ''}`}
        </button>
        {!canRequest ? (
          <p className={styles.muted}>
            Necesitas conexión y una sesión comprobada con el servidor para
            sincronizar.
          </p>
        ) : null}
        {sync.summary ? (
          <p className={styles.notice} role="status">
            {sync.summary}
          </p>
        ) : null}
        {sync.error ? (
          <p className={styles.error} role="alert">
            {sync.error} Los UUID pendientes no se modificaron.
          </p>
        ) : null}
        <p className={styles.muted}>
          “Red disponible” no garantiza acceso a Laravel. No hay reintentos
          automáticos ni envío en segundo plano.
        </p>
      </div>
      <div className={styles.panel}>
        <h2>Eventos de este dispositivo</h2>
        <label className={styles.search}>
          Filtrar resultados
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value)
              setLimit(25)
            }}
          >
            <option value="ALL">Todos</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {visible.length === 0 ? (
          <p className={styles.empty}>
            No hay eventos para este filtro. Las capturas locales aparecerán
            aquí.
          </p>
        ) : null}
        <ol className={styles.resultList}>
          {visible.slice(0, limit).map((entry) => {
            const packet = packages.find(
              (stored) => stored.packet.package_id === entry.packageId,
            )?.packet
            const student = packet?.students.find(
              (row) => row.student_id === entry.payload.student_id,
            )
            return (
              <li className={styles.result} key={entry.key}>
                <header>
                  <strong>
                    {student
                      ? studentName(student)
                      : `Estudiante ${entry.payload.student_id}`}
                  </strong>
                  <span className={styles.badge} data-status={entry.status}>
                    {labels[entry.status]}
                  </span>
                </header>
                <p>{descriptions[entry.status]}</p>
                {entry.result ? <p>{entry.result.message}</p> : null}
                <p className={styles.muted}>
                  {entry.payload.method === 'MANUAL'
                    ? 'Manual'
                    : 'QR provisional'}{' '}
                  · {formatOfflineTime(entry.payload.captured_at)} · Hora
                  declarada por el dispositivo
                </p>
                <details>
                  <summary>Referencia del evento</summary>
                  <p>UUID: {entry.payload.event_id}</p>
                  <p>
                    Lista {entry.listId} · v{entry.version}
                  </p>
                  {entry.result ? (
                    <p>
                      Código: {entry.result.code}
                      {entry.result.entry_id !== null
                        ? ` · Ingreso oficial ${entry.result.entry_id}`
                        : ''}
                    </p>
                  ) : null}
                </details>
              </li>
            )
          })}
        </ol>
        {visible.length > limit ? (
          <button
            className={buttons.secondaryButton}
            onClick={() => setLimit((value) => value + 25)}
          >
            Mostrar 25 más
          </button>
        ) : null}
        <p className={styles.muted}>
          Los conflictos y rechazos se conservan para seguimiento. Esta pantalla
          no resuelve ni convierte esos registros en ingresos aceptados.
        </p>
      </div>
    </section>
  )
}
