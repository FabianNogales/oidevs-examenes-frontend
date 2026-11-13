import { INCIDENT_TYPE_LABELS } from '@/features/incidents/utils/incidentValidation'
import {
  INFRACTION_TYPE_LABELS,
  INFRACTION_STATUS_LABELS,
} from '@/features/infractions/utils/infractionValidation'
export const caseTypeLabel = (type: string) =>
  (
    ({
      ...INCIDENT_TYPE_LABELS,
      ...INFRACTION_TYPE_LABELS,
      EXPULSION: 'Medida histórica',
    }) as Record<string, string>
  )[type] ?? type
export const caseStatusLabel = (status: string) =>
  (
    ({
      ...INFRACTION_STATUS_LABELS,
      REGISTERED: 'Registrada',
      EXPELLED: 'Expulsado',
      PENDING: 'Reportada',
    }) as Record<string, string>
  )[status] ?? status
