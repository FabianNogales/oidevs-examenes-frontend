import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { OfflineAccessGate } from '../components/OfflineAccessGate'
import { readOwnedOfflinePackages } from '../storage/offlineStore'
import { offlineError } from '../api/offlineApi'
import { formatOfflineTime } from '../utils/offlineRules'
import type { OfflineIdentity } from '../services/offlineIdentity'
import type { StoredPackage } from '../types/offline.types'
import styles from '../components/OfflineEntry.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

function OwnedLists({ identity }: { identity: OfflineIdentity }) {
  const [packages, setPackages] = useState<StoredPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    void readOwnedOfflinePackages(identity.ownerId).then(
      (result) => {
        if (active) {
          setPackages(result)
          setError(null)
          setLoading(false)
        }
      },
      (cause: unknown) => {
        if (active) {
          setError(offlineError(cause))
          setLoading(false)
        }
      },
    )
    return () => {
      active = false
    }
  }, [identity.ownerId, attempt])
  const newest = [
    ...new Map(
      packages.toReversed().map((packet) => [packet.examId, packet]),
    ).values(),
  ]
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>EIDA · Este dispositivo</p>
          <h1>Mis listas locales</h1>
          <p>
            Paquetes descargados por {identity.displayName}. Los eventos se
            conservan aunque salgas de una pantalla.
          </p>
        </div>
      </header>
      <p className={styles.notice}>
        Prepara y usa este espacio en la misma pestaña. Al cerrarla o bloquear
        el acceso puede ser necesario volver a verificar tu cuenta con conexión.
      </p>
      {loading ? <p role="status">Abriendo listas locales…</p> : null}
      {error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button
            className={buttons.secondaryButton}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      ) : null}
      {!loading && !error && newest.length === 0 ? (
        <section className={`${styles.panel} ${styles.empty}`}>
          <h2>Aún no descargaste una lista</h2>
          <p>
            No hay una lista disponible para trabajar sin conexión. Conéctate y
            descarga tu lista antes del examen desde su control de ingreso.
          </p>
          <Link className={styles.link} to="/collaborator">
            Ver mis colaboraciones
          </Link>
        </section>
      ) : null}
      <div className={styles.grid}>
        {newest.map((stored) => (
          <article className={styles.panel} key={stored.examId}>
            <p className={styles.eyebrow}>{stored.packet.exam.subject_name}</p>
            <h2>{stored.packet.exam.name}</h2>
            <p>
              Lista {stored.packet.list_id} · v{stored.packet.version} ·{' '}
              {stored.packet.students.length} estudiantes
            </p>
            <p className={styles.muted}>
              Vigencia: {formatOfflineTime(stored.packet.expires_at)}
            </p>
            <Link
              className={buttons.primaryButton}
              to={`/exams/${stored.examId}/offline`}
            >
              Abrir control local
            </Link>
          </article>
        ))}
      </div>
    </main>
  )
}
export function OfflineHomePage() {
  return (
    <OfflineAccessGate>
      {(identity) => (
        <OwnedLists
          key={`${identity.ownerId}:${identity.contextId}`}
          identity={identity}
        />
      )}
    </OfflineAccessGate>
  )
}
