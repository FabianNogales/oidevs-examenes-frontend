import { useProfileRecords } from '../hooks/useProfileRecords'
import { ProfileActiveTermBadge } from '../components/ProfileActiveTermBadge'
import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import cardStyles from '@/shared/components/DataCardGrid/DataCardGrid.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
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
  return careersCount > 1 ? 'Varias carreras asociadas' : careersCount === 1 ? 'Una carrera asociada' : 'Sin carreras asociadas'
}

export function TeacherActiveExamsTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const records = useProfileRecords<TeacherExamItem>(entity, 'exams', searchQuery)
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
            <span className={layoutStyles.examTypeBadge}>{item.examType}</span>
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
          <h2>Exámenes activos</h2>
          <p>
            Evaluaciones programadas vigentes (pendientes de realización)
            asociadas al docente{' '}
            <strong>
              {entity.first_names} {entity.last_names}
            </strong>
            .
          </p>
        </div>
        <ProfileActiveTermBadge className={layoutStyles.termBadge} label="Gestión activa" />
      </div>

      <DataCardGrid
        fields={cardFields}
        data={filteredExams}
        loading={records.loading}
        error={records.error}
        pagination={records.pagination}
        onPageChange={records.onPageChange}
        onRetry={records.reload}
        pageSize={10}
        labelWidth="92px"
        entityLabel="exámenes activos"
        searchPlaceholder="Buscar por materia, codigo, docente o gestion..."
        onSearch={setSearchQuery}
        emptyTitle="Sin exámenes activos programados"
        emptyDescription="El docente no tiene evaluaciones pendientes de realización o no hay coincidencias con la búsqueda."
      />
    </section>
  )
}
