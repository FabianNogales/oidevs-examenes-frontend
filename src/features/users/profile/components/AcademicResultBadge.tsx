import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge, Icon, Text } from '@/shared/components/ui/index'

export type AcademicResult = 'APPROVED' | 'FAILED' | 'NOT_RECORDED'

/** Original result badge preserved; absence of a result never means failure. */
export function AcademicResultBadge({ result }: { result: AcademicResult }) {
  // TODO(HU21-P03): map a verified persisted result before enabling these states.
  // Contract and original Git reference: docs/HU21_HU22_FUNCIONALIDADES_FUTURAS.md.
  if (result !== 'APPROVED' && result !== 'FAILED') {
    return (
      <Text as="span" variant="small" tone="secondary">
        Información no disponible: sin resultado registrado
      </Text>
    )
  }
  const isApproved = result === 'APPROVED'
  return (
    <Badge
      tone={isApproved ? 'success' : 'danger'}
      size="sm"
      icon={<Icon icon={isApproved ? CheckCircle2 : XCircle} size="sm" />}
    >
      {isApproved ? 'Aprobado' : 'Reprobado'}
    </Badge>
  )
}
