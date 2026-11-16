import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import cardStyles from '@/shared/components/DataCardGrid/DataCardGrid.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import { Badge, Stack, Text } from '@/shared/components/ui/index'
import { useProfileRecords } from '../hooks/useProfileRecords'
import { ProfileActiveTermBadge } from '../components/ProfileActiveTermBadge'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export type TeacherExamTypeLabel =
  | 'Parcial'
  | 'Recuperatorio'
  | 'No registrado'
  | 'Primer parcial'
  | 'Segundo parcial'
  | 'Examen final'
  | 'Segunda instancia'
  | 'Mesa'

interface TeacherExamItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  examDate: string
  examType: TeacherExamTypeLabel
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

export function TeacherActiveExamsTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const records = useProfileRecords<TeacherExamItem>(
    entity,
    'exams',
    searchQuery,
  )
  const filteredExams = records.items

  const cardFields = useMemo<readonly CardFieldDef<TeacherExamItem>[]>(
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
        id: 'dateAndExamType',
        label: 'Fecha',
        cell: (item) => (
          <div className={cardStyles.inlinePairedRow}>
            <span className={tableStyles.primaryText}>{item.examDate}</span>
            <span className={cardStyles.inlineSecondaryLabel}>Examen</span>
            <Badge
              tone="accent"
              size="sm"
              className={layoutStyles.examTypeBadge}
            >
              {item.examType}
            </Badge>
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
            Evaluaciones programadas vigentes (pendientes de realización)
            asociadas al docente.
          </Text>
        </div>
        <ProfileActiveTermBadge
          className={layoutStyles.termBadge}
          label="Gestión activa"
        />
      </div>

      <DataCardGrid
        fields={cardFields}
        getCardConfig={(item) => ({
          badgeLabel: item.examType,
          title: item.subjectName,
          headline: { label: 'Código', value: item.subjectCode },
          splitLeft: { label: 'Grupo', value: `Grupo ${item.groupCode}` },
          splitRight: { label: 'Gestión', value: item.academicTerm },
          primaryMeta: { label: 'Fecha', value: item.examDate },
          secondaryMeta: {
            label: 'Carrera(s)',
            value: item.careers.join(' - '),
          },
        })}
        data={filteredExams}
        loading={records.loading}
        error={records.error}
        pagination={records.pagination}
        onPageChange={records.onPageChange}
        onRetry={records.reload}
        pageSize={10}
        labelWidth="92px"
        entityLabel="exámenes activos"
        searchPlaceholder="Buscar por materia, código o docente"
        onSearch={setSearchQuery}
        emptyTitle="Sin exámenes activos programados"
        emptyDescription="El docente no tiene evaluaciones pendientes de realización o no hay coincidencias con la búsqueda."
      />
    </Stack>
  )
}
