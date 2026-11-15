import { useMemo } from 'react'
import { CheckCircle2, History, UserCheck } from 'lucide-react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import {
  Badge,
  Icon,
  Stack,
  Text,
  type BadgeTone,
} from '@/shared/components/ui/index'
import { useProfileRecords } from '../hooks/useProfileRecords'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

type SystemRoleCode =
  | 'STUDENT'
  | 'COLLABORATOR'
  | 'TEACHER'
  | 'ADMIN'
  | 'UNKNOWN'

interface RoleHistoryAuditItem extends BaseTableEntity {
  id: number
  roleCode: SystemRoleCode
  roleLabel: string
  actionDescription: string
  changedAt: string
  authorizedByName: string
  authorizedByRole: string
}

const ROLE_BADGE_STYLE_MAP: Record<SystemRoleCode, string> = {
  STUDENT: layoutStyles.rolePillStudent,
  COLLABORATOR: layoutStyles.rolePillCollaborator,
  TEACHER: layoutStyles.rolePillTeacher,
  ADMIN: layoutStyles.rolePillAdmin,
  UNKNOWN: '',
}

const ROLE_BADGE_TONE_MAP: Record<SystemRoleCode, BadgeTone> = {
  STUDENT: 'info',
  COLLABORATOR: 'warning',
  TEACHER: 'accent',
  ADMIN: 'info',
  UNKNOWN: 'neutral',
}

function splitDateAndTime(changedAt: string): { date: string; time: string } {
  if (changedAt.includes(',')) {
    const [datePart, ...rest] = changedAt.split(',')
    return {
      date: datePart.trim(),
      time: rest.join(',').trim() || 'No registrada',
    }
  }
  return { date: changedAt, time: 'No registrada' }
}

export function RoleHistoryTab({ entity }: ProfileTabComponentProps) {
  const records = useProfileRecords<RoleHistoryAuditItem>(
    entity,
    'roles',
    '',
  )
  const filteredRoleLogs = records.items

  const cardFields = useMemo<readonly CardFieldDef<RoleHistoryAuditItem>[]>(
    () => [
      {
        id: 'role',
        label: 'Rol asignado',
        cell: (item) => (
          <Badge
            tone={ROLE_BADGE_TONE_MAP[item.roleCode]}
            size="sm"
            className={`${layoutStyles.rolePill} ${
              ROLE_BADGE_STYLE_MAP[item.roleCode]
            }`}
          >
            {item.roleLabel}
          </Badge>
        ),
      },
      {
        id: 'description',
        label: 'Accion registrada',
        accessorKey: 'actionDescription',
      },
      {
        id: 'authorizedBy',
        label: 'Autorizado por',
        cell: (item) => (
          <div>
            <span className={tableStyles.primaryText}>
              {item.authorizedByName}
            </span>
            <span className={tableStyles.secondaryText}>
              Rol autorizador: {item.authorizedByRole}
            </span>
          </div>
        ),
      },
      {
        id: 'changedAt',
        label: 'Fecha exacta',
        accessorKey: 'changedAt',
      },
    ],
    [],
  )

  const entityRoleLabel =
    entity.role === 'TEACHER'
      ? 'el docente'
      : entity.role === 'ADMIN'
        ? 'el administrador'
        : 'el estudiante'

  return (
    <Stack direction="vertical" gap="4">
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <Text variant="body" tone="primary">
            Bitácora de auditoría inmutable con los roles ejercidos por{' '}
            {entityRoleLabel}, detallando el administrador o
            docente que autorizó cada cambio.
          </Text>
        </div>
      </div>

      <DataCardGrid
        fields={cardFields}
        getCardConfig={(item) => {
          const isCurrentRole = item.roleCode === entity.role
          const { date, time } = splitDateAndTime(item.changedAt)
          return {
            headerIcon: <Icon icon={UserCheck} size="md" />,
            badgeLabel: isCurrentRole ? 'Activo' : 'Inactivo',
            badgeTone: isCurrentRole ? 'success' : 'neutral',
            badgeIcon: (
              <Icon icon={isCurrentRole ? CheckCircle2 : History} size="sm" />
            ),
            title: `Rol asignado: ${item.roleLabel}`,
            headline: { label: 'Autorizado por', value: item.authorizedByName },
            primaryMeta: {
              label: 'Rol autorizador',
              value: item.authorizedByRole,
            },
            splitPosition: 'afterMeta',
            splitLeft: { label: 'Fecha', value: date },
            splitRight: { label: 'Hora', value: time },
          }
        }}
        data={filteredRoleLogs}
        loading={records.loading}
        error={records.error}
        pagination={records.pagination}
        onPageChange={records.onPageChange}
        onRetry={records.reload}
        pageSize={10}
        labelWidth="92px"
        entityLabel="registros de rol"
        emptyTitle="Sin cambios de rol registrados"
        emptyDescription="No hay eventos conservados para esta consulta. No se reconstruyen asignaciones anteriores sin auditoría."
      />
    </Stack>
  )
}
