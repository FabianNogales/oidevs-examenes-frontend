import { useProfileRecords } from '../hooks/useProfileRecords'
import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import cardStyles from '@/shared/components/DataCardGrid/DataCardGrid.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
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
  return careersCount > 1 ? 'Varias carreras asociadas' : careersCount === 1 ? 'Una carrera asociada' : 'Sin carreras asociadas'
}

export function TeacherSubjectHistoryTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const records = useProfileRecords<TeacherSubjectHistoryItem>(entity, 'subject-history', searchQuery)
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
            <span
              className={`${layoutStyles.rolePill} ${
                isMixed
                  ? layoutStyles.rolePillCollaborator
                  : layoutStyles.rolePillStudent
              }`}
            >
              {getGroupTypeLabel(item.careers.length)}
            </span>
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
    <section className={layoutStyles.sectionCard}>
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <h2>Historial de materias dictadas</h2>
          <p>
            Registro histórico de asignaturas impartidas por{' '}
            <strong>
              {entity.first_names} {entity.last_names}
            </strong>{' '}
            en gestiones académicas pasadas.
          </p>
        </div>
      </div>

      <DataCardGrid
        fields={cardFields}
        data={filteredHistory}
        loading={records.loading}
        error={records.error}
        pagination={records.pagination}
        onPageChange={records.onPageChange}
        onRetry={records.reload}
        pageSize={10}
        labelWidth="92px"
        entityLabel="materias históricas"
        searchPlaceholder="Buscar por materia, codigo, docente o gestion..."
        onSearch={setSearchQuery}
        emptyTitle="Sin historial de materias dictadas"
        emptyDescription="No se encontraron asignaturas impartidas en gestiones anteriores con ese criterio."
      />
    </section>
  )
}