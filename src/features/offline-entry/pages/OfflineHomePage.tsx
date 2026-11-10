import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Clock, FolderKanban } from 'lucide-react'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { OfflineAccessGate } from '../components/OfflineAccessGate'
import { readOwnedOfflinePackages } from '../storage/offlineStore'
import { offlineError } from '../api/offlineApi'
import { formatOfflineTime } from '../utils/offlineRules'
import type { OfflineIdentity } from '../services/offlineIdentity'
import type { StoredPackage } from '../types/offline.types'
import shared from "../components/OfflineShared.module.css";
import distStyles from "../components/OfflineDistribution.module.css";
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
    <main>
      <PageContainer className={shared.page}>
        <PageHeader
          eyebrow="EIDA · Este dispositivo"
          subtitle="Mis listas locales"
          description={`Paquetes descargados por ${identity.displayName}. Los eventos se conservan aunque salgas de una pantalla.`}
          breadcrumbs={[
            { label: 'Inicio', to: '/' },
            { label: 'Mis listas locales' },
          ]}
        />
      <p className={shared.notice}>
        Prepara y usa este espacio en la misma pestaña. Al cerrarla o bloquear
        el acceso puede ser necesario volver a verificar tu cuenta con conexión.
      </p>
      {loading ? <p role="status">Abriendo listas locales…</p> : null}
      {error ? (
        <div className={shared.error} role="alert">
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
        <section className={`${shared.panel} ${shared.empty}`}>
          <FolderKanban
            size={36}
            strokeWidth={1.65}
            color="var(--color-primary)"
            style={{ marginInline: 'auto', marginBottom: '12px' }}
            aria-hidden="true"
          />
          <h2>Aún no descargaste una lista</h2>
          <p>
            No hay una lista disponible para trabajar sin conexión. Conéctate y
            descarga tu lista antes del examen desde su control de ingreso.
          </p>
          <Link className={shared.link} to="/collaborator">
            <span>Ver mis colaboraciones</span>
            <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </section>
      ) : null}
      <div className={distStyles.cardsGrid}>
        {newest.map((stored) => (
          <article className={distStyles.assignmentCard} key={stored.examId}>
            <div>
              <p className={shared.eyebrow}>
                {stored.packet.exam.subject_name}
              </p>
              <h2>{stored.packet.exam.name}</h2>
              <p>
                Lista {stored.packet.list_id} · v{stored.packet.version} ·{' '}
                <strong>{stored.packet.students.length}</strong> estudiantes
              </p>
              <p className={shared.headerSubtitle}>
                <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
                <span>
                  Vigencia: {formatOfflineTime(stored.packet.expires_at)}
                </span>
              </p>
            </div>
            <Link
              className={buttons.primaryButton}
              to={`/exams/${stored.examId}/offline`}
            >
              Abrir control local
            </Link>
          </article>
        ))}
      </div>
      </PageContainer>
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