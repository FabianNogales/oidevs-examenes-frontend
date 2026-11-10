import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import {
  Badge,
  Card,
  Heading,
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

export function RoleHistoryTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const records = useProfileRecords<RoleHistoryAuditItem>(
    entity,
    'roles',
    searchQuery,
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

  return (
    <Card as="section" className={layoutStyles.sectionCard}>
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <Heading level={2}>Historial de roles</Heading>
          <Text variant="small" tone="secondary">
            Bitácora de auditoría inmutable con los roles ejercidos por{' '}
            <strong>
              {entity.first_names} {entity.last_names}
            </strong>
            , detallando la fecha exacta y el administrador o docente que
            autorizó cada cambio.
          </Text>
        </div>
      </div>

      <Text variant="small" tone="secondary">
        Solo se muestran eventos persistidos; no se reconstruyen cambios
        anteriores. Los nombres de responsables y exámenes corresponden a sus
        registros actuales.
      </Text>
      <DataCardGrid
        fields={cardFields}
        data={filteredRoleLogs}
        loading={records.loading}
        error={records.error}
        pagination={records.pagination}
        onPageChange={records.onPageChange}
        onRetry={records.reload}
        pageSize={10}
        labelWidth="92px"
        entityLabel="registros de rol"
        searchPlaceholder="Buscar por código de acción registrado (USER_ROLE, EXAM_COLLABORATOR...)"
        onSearch={setSearchQuery}
        emptyTitle="Sin cambios de rol registrados"
        emptyDescription="No hay eventos conservados para esta consulta. No se reconstruyen asignaciones anteriores sin auditoría."
      />
    </Card>
  )
}
