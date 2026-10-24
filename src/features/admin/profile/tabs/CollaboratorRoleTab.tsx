import { useProfileRecords } from '../hooks/useProfileRecords'
import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import cardStyles from '@/shared/components/DataCardGrid/DataCardGrid.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
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

  const records = useProfileRecords<CollaboratorAssignmentItem>(entity, 'collaborations', searchQuery, selectedTab)
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
            <span className={layoutStyles.examTypeBadge}>{item.examType}</span>
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
    <section className={layoutStyles.sectionCard}>
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <h2>Rol colaborador en control de exámenes</h2>
          <p>
            {isShowingActive
              ? `Designaciones vigentes donde ${entity.first_names} ${entity.last_names} es colaborador actualmente.`
              : `Ultima asignacion conservada por examen donde ${entity.first_names} ${entity.last_names} fue colaborador.`}
          </p>
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
            <span>Concluidas</span>
            <span className={layoutStyles.filterTabCounter}>
              {totalCompletedCount}
            </span>
          </button>
        </div>
      </div>

      <p>Última asignación conservada por examen. Los períodos anteriores con auditoría se consultan en Historial de roles y autorizaciones.</p>
      <DataCardGrid
        key={selectedTab}
        fields={cardFields}
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
        searchPlaceholder="Buscar por materia, código, docente o gestión..."
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
    </section>
  )
}
