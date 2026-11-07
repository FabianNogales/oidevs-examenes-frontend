import { useProfileRecords } from '../hooks/useProfileRecords'
import { AcademicResultBadge } from '../components/AcademicResultBadge'
import type { AcademicResult } from '../components/AcademicResultBadge'
import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import cardStyles from '@/shared/components/DataCardGrid/DataCardGrid.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

interface SubjectHistoryItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  groupCode: string
  teacherFullName: string
  teacherEmail: string
  academicTerm: string
  approvalStatus: AcademicResult
}

export function StudentSubjectHistoryTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const records = useProfileRecords<SubjectHistoryItem>(entity, 'subject-history', searchQuery)
  const filteredHistory = records.items

  const cardFields = useMemo<readonly CardFieldDef<SubjectHistoryItem>[]>(
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
        id: 'approvalStatus',
        label: 'Resultado',
        cell: (item) => <AcademicResultBadge result={item.approvalStatus} />,
      },
    ],
    [],
  )

  return (
    <section className={layoutStyles.sectionCard}>
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <h2>Historial de materias</h2>
          <p>
            Registro histórico de asignaturas cursadas por{' '}
            <strong>
              {entity.first_names} {entity.last_names}
            </strong>{' '}
            en otras gestiones o con inscripción inactiva. No hay calificaciones finales registradas en EIDA.
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
        emptyTitle="Sin historial académico registrado"
        emptyDescription="No se encontraron materias cursadas en gestiones pasadas con ese criterio."
      />
    </section>
  )
}
