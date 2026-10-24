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

interface CurrentSubjectEnrollmentItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  groupCode: string
  teacherFullName: string
  teacherEmail: string
  academicTerm: string
}

export function StudentCurrentSubjectsTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const records = useProfileRecords<CurrentSubjectEnrollmentItem>(entity, 'subjects', searchQuery)
  const filteredSubjects = records.items

  const cardFields = useMemo<
    readonly CardFieldDef<CurrentSubjectEnrollmentItem>[]
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
    ],
    [],
  )

  return (
    <section className={layoutStyles.sectionCard}>
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <h2>Materias actuales</h2>
          <p>
            Asignaturas en las que{' '}
            <strong>
              {entity.first_names} {entity.last_names}
            </strong>{' '}
            se encuentra inscrito durante el periodo académico activo.
          </p>
        </div>
        <ProfileActiveTermBadge
          className={`${layoutStyles.subSectionBadgeCount} ${layoutStyles.badgeCountActive}`}
          label="Periodo activo"
        />
      </div>

      <DataCardGrid
        fields={cardFields}
        data={filteredSubjects}
        loading={records.loading}
        error={records.error}
        pagination={records.pagination}
        onPageChange={records.onPageChange}
        onRetry={records.reload}
        pageSize={10}
        labelWidth="92px"
        entityLabel="materias inscritas"
        searchPlaceholder="Buscar por materia, codigo, docente o gestion..."
        onSearch={setSearchQuery}
        emptyTitle="Sin materias inscritas en la gestión actual"
        emptyDescription="El estudiante no registra inscripciones activas o no existen coincidencias con la búsqueda."
      />
    </section>
  )
}
