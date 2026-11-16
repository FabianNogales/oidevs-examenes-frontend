import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import cardStyles from '@/shared/components/DataCardGrid/DataCardGrid.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import { Badge, Stack, Text } from '@/shared/components/ui/index'
import { useProfileRecords } from '../hooks/useProfileRecords'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

interface TeacherSubjectHistoryItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  groupCode: string
  academicTerm: string
  careers: readonly string[]
}

function getGroupTypeLabel(careersCount: number): string {
  return careersCount > 1
    ? 'Varias carreras asociadas'
    : careersCount === 1
      ? 'Una carrera asociada'
      : 'Sin carreras asociadas'
}

export function TeacherSubjectHistoryTab({
  entity,
}: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const records = useProfileRecords<TeacherSubjectHistoryItem>(
    entity,
    'subject-history',
    searchQuery,
  )
  const filteredHistory = records.items

  const cardFields = useMemo<readonly CardFieldDef<TeacherSubjectHistoryItem>[]>(
    () => [
      {
        id: 'subject',
        label: 'Materia',
        cell: (item) => (
          <div>
            <span className={tableStyles.primaryText}>{item.subjectName}</span>
            <span className={tableStyles.secondaryText}>
              Código: {item.subjectCode}
            </span>
          </div>
        ),
      },
      {
        id: 'groupAndTerm',
        label: 'Grupo',
        cell: (item) => (
          <div className={cardStyles.inlinePairedRow}>
            <span className={cardStyles.fullWidthPillGray}>
              Grupo {item.groupCode}
            </span>
            <span className={cardStyles.inlineSecondaryLabel}>Gestión</span>
            <span className={cardStyles.fullWidthPillBlueCentered}>
              {item.academicTerm}
            </span>
          </div>
        ),
      },
      {
        id: 'groupType',
        label: 'Vinculacion',
        cell: (item) => {
          const isMixed = item.careers.length > 1
          return (
            <Badge
              tone={isMixed ? 'warning' : 'info'}
              size="sm"
              className={`${layoutStyles.rolePill} ${
                isMixed
                  ? layoutStyles.rolePillCollaborator
                  : layoutStyles.rolePillStudent
              }`}
            >
              {getGroupTypeLabel(item.careers.length)}
            </Badge>
          )
        },
      },
      {
        id: 'careers',
        label: 'Carrera(s)',
        cell: (item) => (
          <span className={tableStyles.primaryText}>
            {item.careers.join(' - ')}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <Stack direction="vertical" gap="4">
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <Text variant="body" tone="primary">
            Registro histórico de asignaturas impartidas por el docente en
            gestiones académicas pasadas.
          </Text>
        </div>
      </div>

      <DataCardGrid
        fields={cardFields}
        getCardConfig={(item) => ({
          badgeLabel: 'MATERIA',
          title: item.subjectName,
          headline: { label: 'Código', value: item.subjectCode },
          splitLeft: { label: 'Grupo', value: `Grupo ${item.groupCode}` },
          splitRight: { label: 'Gestión', value: item.academicTerm },
          primaryMeta: {
            label: 'Carrera(s)',
            value: item.careers.join(' - '),
          },
        })}
        data={filteredHistory}
        loading={records.loading}
        error={records.error}
        pagination={records.pagination}
        onPageChange={records.onPageChange}
        onRetry={records.reload}
        pageSize={10}
        labelWidth="92px"
        entityLabel="materias históricas"
        searchPlaceholder="Buscar por materia, código o docente"
        onSearch={setSearchQuery}
        emptyTitle="Sin historial de materias dictadas"
        emptyDescription="No se encontraron asignaturas impartidas en gestiones anteriores con ese criterio."
      />
    </Stack>
  )
}
