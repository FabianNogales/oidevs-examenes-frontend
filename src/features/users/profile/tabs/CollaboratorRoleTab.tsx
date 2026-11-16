import { useState, useMemo } from 'react'
import { CheckCircle2, History } from 'lucide-react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import cardStyles from '@/shared/components/DataCardGrid/DataCardGrid.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import { Badge, Icon, Stack, Text } from '@/shared/components/ui/index'
import { useProfileRecords } from '../hooks/useProfileRecords'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

export type ExamEvaluationTypeLabel =
  | 'Parcial'
  | 'Recuperatorio'
  | 'No registrado'
  | 'Primer parcial'
  | 'Segundo parcial'
  | 'Examen final'
  | 'Segunda instancia'
  | 'Mesa'

export type CollaborationTabFilter = 'ACTIVE' | 'COMPLETED'

interface CollaboratorAssignmentItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  groupCode: string
  academicTerm: string
  teacherFullName: string
  teacherEmail: string
  examType: ExamEvaluationTypeLabel
  assignedAt: string
  collaborationStatus: CollaborationTabFilter
}

export function CollaboratorRoleTab({ entity }: ProfileTabComponentProps) {
  const [selectedTab, setSelectedTab] =
    useState<CollaborationTabFilter>('ACTIVE')
  const [searchQuery, setSearchQuery] = useState('')

  const records = useProfileRecords<CollaboratorAssignmentItem>(
    entity,
    'collaborations',
    searchQuery,
    selectedTab,
  )
  const filteredCollaborations = records.items
  const totalActiveCount = records.summary?.active ?? 0
  const totalCompletedCount = records.summary?.completed ?? 0

  const cardFields = useMemo<
    readonly CardFieldDef<CollaboratorAssignmentItem>[]
  >(
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
        id: 'teacher',
        label: 'Docente',
        cell: (item) => (
          <div>
            <span className={tableStyles.primaryText}>
              {item.teacherFullName}
            </span>
            <span className={tableStyles.secondaryText}>
              {item.teacherEmail}
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
        id: 'assignedAtAndExam',
        label: 'Designación',
        cell: (item) => (
          <div className={cardStyles.inlinePairedRow}>
            <span className={tableStyles.primaryText}>{item.assignedAt}</span>
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
    ],
    [],
  )

  const isShowingActive = selectedTab === 'ACTIVE'
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
            {isShowingActive
              ? `Designaciones vigentes donde ${entityRoleLabel} es colaborador actualmente.`
              : `Última asignación conservada por examen donde ${entityRoleLabel} fue colaborador.`}
          </Text>
        </div>

        <div
          className={layoutStyles.filterTabsContainer}
          role="tablist"
          aria-label="Filtrar colaboraciones por estado"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isShowingActive}
            className={`${layoutStyles.filterTabBtn} ${
              isShowingActive ? layoutStyles.filterTabBtnActive : ''
            }`}
            onClick={() => setSelectedTab('ACTIVE')}
          >
            <Icon icon={CheckCircle2} size="sm" />
            <span>Activas</span>
            <span className={layoutStyles.filterTabCounter}>
              {totalActiveCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={!isShowingActive}
            className={`${layoutStyles.filterTabBtn} ${
              !isShowingActive ? layoutStyles.filterTabBtnCompletedActive : ''
            }`}
            onClick={() => setSelectedTab('COMPLETED')}
          >
            <Icon icon={History} size="sm" />
            <span>Concluidas</span>
            <span className={layoutStyles.filterTabCounter}>
              {totalCompletedCount}
            </span>
          </button>
        </div>
      </div>

      <DataCardGrid
        key={selectedTab}
        fields={cardFields}
        getCardConfig={(item) => ({
          badgeLabel: 'COLABORADOR',
          title: item.subjectName,
          headline: { label: 'Código', value: item.subjectCode },
          splitLeft: { label: 'Grupo', value: `Grupo ${item.groupCode}` },
          splitRight: { label: 'Gestión', value: item.academicTerm },
          primaryMeta: { label: 'Docente', value: item.teacherFullName },
          secondaryMeta: { label: 'Correo', value: item.teacherEmail },
          footerExtra: (
            <Badge
              tone="accent"
              size="sm"
              className={layoutStyles.examTypeBadge}
            >
              {item.examType} · {item.assignedAt}
            </Badge>
          ),
        })}
        data={filteredCollaborations}
        loading={records.loading}
        error={records.error}
        pagination={records.pagination}
        onPageChange={records.onPageChange}
        onRetry={records.reload}
        pageSize={10}
        labelWidth="92px"
        entityLabel={
          isShowingActive
            ? 'colaboraciones activas'
            : 'colaboraciones concluidas'
        }
        searchPlaceholder="Buscar por materia, código o docente"
        initialSearch={searchQuery}
        onSearch={setSearchQuery}
        emptyTitle={
          isShowingActive
            ? 'Sin colaboraciones activas'
            : 'Sin colaboraciones concluidas'
        }
        emptyDescription={
          isShowingActive
            ? `Actualmente ${entityRoleLabel} no tiene designaciones activas como colaborador.`
            : `No se encontraron registros históricos de colaboración para ${entityRoleLabel}.`
        }
      />
    </Stack>
  )
}
