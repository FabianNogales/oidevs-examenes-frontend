import { Layers, UserCheck, Users } from 'lucide-react'
import distStyles from './OfflineDistribution.module.css'

export interface DistributionSummaryMetricsProps {
  totalStudents: number | null
  collaboratorsCount: number | null
  hasPreparedDistribution: boolean
  distributionVersion: number | null
}

// Renderiza las métricas resumidas de la distribución del examen
export function DistributionSummaryMetrics({
  totalStudents,
  collaboratorsCount,
  hasPreparedDistribution,
  distributionVersion,
}: DistributionSummaryMetricsProps) {
  return (
    <div className={distStyles.metricsRow}>
      <div className={distStyles.metricCard}>
        <span className={distStyles.metricCardIcon} aria-hidden="true">
          <Users size={20} strokeWidth={1.85} />
        </span>
        <div className={distStyles.metricCardBody}>
          <strong>{totalStudents ?? '—'}</strong>
          <span>
            Estudiantes inscritos
            {totalStudents === null ? ' · por consultar' : ''}
          </span>
        </div>
      </div>

      <div className={distStyles.metricCard}>
        <span className={distStyles.metricCardIcon} aria-hidden="true">
          <UserCheck size={20} strokeWidth={1.85} />
        </span>
        <div className={distStyles.metricCardBody}>
          <strong>{collaboratorsCount ?? '—'}</strong>
          <span>
            {hasPreparedDistribution
              ? 'Colaboradores con lista'
              : 'Colaboradores registrados'}
          </span>
        </div>
      </div>

      <div className={distStyles.metricCard}>
        <span className={distStyles.metricCardIcon} aria-hidden="true">
          <Layers size={20} strokeWidth={1.85} />
        </span>
        <div className={distStyles.metricCardBody}>
          <strong>
            {distributionVersion !== null ? `v${distributionVersion}` : '—'}
          </strong>
          <span>
            {hasPreparedDistribution
              ? 'Distribución preparada'
              : 'Sin distribución confirmada'}
          </span>
        </div>
      </div>
    </div>
  )
}