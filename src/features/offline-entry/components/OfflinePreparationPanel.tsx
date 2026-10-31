import type { useOfflinePreparation } from '../hooks/useOfflinePreparation'
import type { LocalEntry, StoredPackage } from '../types/offline.types'
import { formatOfflineTime } from '../utils/offlineRules'
import { OfflineDataDeletion } from './OfflineDataDeletion'
import styles from './OfflineEntry.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

export function OfflinePreparationPanel({
  ownerId,
  examId,
  stored,
  entries,
  preparation,
  canRequest,
  online,
  now,
  syncing,
  onDeleted,
}: {
  ownerId: number
  examId: number
  stored: StoredPackage | null
  entries: LocalEntry[]
  preparation: ReturnType<typeof useOfflinePreparation>
  canRequest: boolean
  online: boolean
  now: number
  syncing: boolean
  onDeleted: () => void
}) {
  const expired = stored !== null && now >= Date.parse(stored.packet.expires_at)
  const available =
    stored && !expired && !stored.staleReason && preparation.shell?.ready
  const label = preparation.busy
    ? 'Descargando y guardando lista…'
    : !stored
      ? 'Sin preparar'
      : stored.staleReason
        ? 'Lista desactualizada'
        : expired
          ? 'Paquete vencido'
          : available
            ? 'Lista disponible sin conexión'
            : 'Lista guardada · apertura offline por confirmar'
  return (
    <section
      className={styles.panel}
      aria-labelledby="offline-preparation-title"
    >
      <p className={styles.eyebrow}>HU36 · Preparación del dispositivo</p>
      <h2 id="offline-preparation-title">
        Preparación del control sin conexión
      </h2>
      <p>
        Descarga tu lista mientras tienes conexión. La persistencia de datos y
        los recursos de la aplicación se comprueban por separado.
      </p>
      <p className={styles.badge} role="status">
        {label}
      </p>
      {stored ? (
        <dl className={styles.details}>
          <div>
            <dt>Estudiantes asignados</dt>
            <dd>{stored.packet.students.length}</dd>
          </div>
          <div>
            <dt>Lista y versión</dt>
            <dd>
              {stored.packet.list_id} · v{stored.packet.version}
            </dd>
          </div>
          <div>
            <dt>Preparación del paquete</dt>
            <dd>{formatOfflineTime(stored.packet.prepared_at)}</dd>
          </div>
          <div>
            <dt>Guardado en el dispositivo</dt>
            <dd>{formatOfflineTime(stored.savedAt)}</dd>
          </div>
        </dl>
      ) : (
        <div className={styles.notice} role="status">
          No hay una lista disponible para trabajar sin conexión. Conéctate y
          descarga tu lista antes del examen.
        </div>
      )}
      {stored?.staleReason ? (
        <p className={styles.error} role="alert">
          {stored.staleReason}
        </p>
      ) : null}
      {expired ? (
        <p className={styles.notice} data-warning="true">
          El paquete venció según el reloj local. Se conservan los eventos para
          envío y revisión; no se permiten nuevas capturas.
        </p>
      ) : null}
      {preparation.error ? (
        <p className={styles.error} role="alert">
          {preparation.error}
        </p>
      ) : null}
      {preparation.shell ? (
        <p className={styles.notice} data-warning={!preparation.shell.ready}>
          {preparation.shell.message}
        </p>
      ) : (
        <p role="status">Comprobando recursos de la aplicación…</p>
      )}
      {!canRequest ? (
        <p className={styles.muted}>
          {online
            ? 'Verifica tu sesión con el servidor antes de descargar otra lista.'
            : 'La descarga necesita conexión. La lista guardada puede consultarse localmente.'}
        </p>
      ) : null}
      <div className={styles.actions}>
        <button
          className={buttons.primaryButton}
          disabled={!canRequest || preparation.busy || syncing}
          onClick={() => void preparation.download()}
        >
          {preparation.busy
            ? 'Descargando…'
            : stored
              ? 'Descargar una copia actualizada'
              : 'Descargar lista para uso sin conexión'}
        </button>
        {stored ? (
          <OfflineDataDeletion
            ownerId={ownerId}
            examId={examId}
            entries={entries}
            disabled={preparation.busy || syncing}
            onDeleted={onDeleted}
          />
        ) : null}
      </div>
      <p className={styles.muted}>
        Las descargas anteriores y sus eventos se conservan. Actualizar no
        cambia los UUID ni los paquetes usados por ingresos pendientes.
      </p>
    </section>
  )
}
