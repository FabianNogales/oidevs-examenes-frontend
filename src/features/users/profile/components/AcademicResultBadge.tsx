import tableStyles from '@/shared/components/DataTable/DataTable.module.css'

export type AcademicResult = 'APPROVED' | 'FAILED' | 'NOT_RECORDED'

/** Original result badge preserved; absence of a result never means failure. */
export function AcademicResultBadge({ result }: { result: AcademicResult }) {
  // TODO(HU21-P03): map a verified persisted result before enabling these states.
  // Contract and original Git reference: docs/HU21_HU22_FUNCIONALIDADES_FUTURAS.md.
  if (result !== 'APPROVED' && result !== 'FAILED') {
    return <span>Información no disponible: sin resultado registrado</span>
  }
  const isApproved = result === 'APPROVED'
  return (
    <span className={`${tableStyles.statusBadge} ${isApproved ? tableStyles.statusActive : tableStyles.statusInactive}`}>
      <span className={tableStyles.statusDot} aria-hidden="true" />
      {isApproved ? 'Aprobado' : 'Reprobado'}
    </span>
  )
}
