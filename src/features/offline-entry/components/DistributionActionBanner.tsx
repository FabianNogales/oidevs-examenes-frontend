import { Link } from 'react-router'
import { ArrowUpRight, Lock, MonitorDown, RefreshCw } from 'lucide-react'
import shared from './styles/OfflineShared.module.css'
import distStyles from './styles/OfflineDistribution.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

export interface DistributionActionBannerProps {
  examId: number
  isPrepared: boolean
  isLoading: boolean
  isPreparing: boolean
  isOnline: boolean
  canPrepare: boolean
  totalStudents: number | null
  onReload: () => void
  onRequestPrepare: () => void
}

// Renderiza el bloque de estado y acciones de la distribución de listas
export function DistributionActionBanner({
  examId,
  isPrepared,
  isLoading,
  isPreparing,
  isOnline,
  canPrepare,
  totalStudents,
  onReload,
  onRequestPrepare,
}: DistributionActionBannerProps) {
  return (
    <section className={distStyles.distributionBannerCard}>
      <div className={distStyles.distributionHeaderRow}>
        <div className={distStyles.distributionTitleGroup}>
          <span className={distStyles.lockIconBox} aria-hidden="true">
            <Lock size={20} strokeWidth={1.85} />
          </span>
          <div>
            <h2>
              {isPrepared
                ? 'Distribución preparada'
                : 'Preparar listas del examen'}
            </h2>
            <p>
              {isPrepared
                ? 'La versión 1 está congelada. Puedes consultar sus estudiantes y responsables.'
                : 'El servidor calculará las listas equilibradas según las inscripciones y autorizaciones vigentes.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          className={distStyles.refreshOutlineButton}
          disabled={isLoading || isPreparing || !isOnline}
          onClick={onReload}
        >
          <RefreshCw size={15} strokeWidth={1.85} aria-hidden="true" />
          <span>Actualizar consulta</span>
        </button>
      </div>

      {isLoading ? (
        <p role="status" style={{ marginTop: '16px' }}>
          Consultando distribución…
        </p>
      ) : null}

      {!isLoading && !isPrepared ? (
        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            className={buttons.primaryButton}
            disabled={!canPrepare || isPreparing}
            onClick={onRequestPrepare}
          >
            Preparar listas
          </button>
        </div>
      ) : null}

      {isPrepared ? (
        <Link
          className={distStyles.deviceCtaBar}
          to={`/exams/${examId}/offline`}
        >
          <span className={distStyles.deviceCtaLeft}>
            <MonitorDown size={16} strokeWidth={1.85} aria-hidden="true" />
            <span>Preparar mi dispositivo para el control sin conexión</span>
          </span>
          <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      ) : null}

      {!isPrepared && totalStudents === 0 ? (
        <p className={shared.muted} style={{ marginTop: '12px' }}>
          El examen no tiene inscripciones activas. Las listas que se preparen
          estarán vacías y quedarán congeladas.
        </p>
      ) : null}
    </section>
  )
}