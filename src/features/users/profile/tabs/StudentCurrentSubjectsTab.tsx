import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import cardStyles from '@/shared/components/DataCardGrid/DataCardGrid.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import { Stack, Text } from '@/shared/components/ui/index'
import { useProfileRecords } from '../hooks/useProfileRecords'
import { ProfileActiveTermBadge } from '../components/ProfileActiveTermBadge'
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

export function StudentCurrentSubjectsTab({
  entity,
}: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const records = useProfileRecords<CurrentSubjectEnrollmentItem>(
    entity,
    'subjects',
    searchQuery,
  )
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
    <Stack direction="vertical" gap="4">
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <Text variant="body" tone="primary">
            Asignaturas en las que el estudiante se encuentra inscrito durante
            el periodo académico actual.
          </Text>
        </div>
        <ProfileActiveTermBadge
          className={`${layoutStyles.subSectionBadgeCount} ${layoutStyles.badgeCountActive}`}
          label="Periodo activo"
        />
      </div>

      <DataCardGrid
        fields={cardFields}
        getCardConfig={(item) => ({
          badgeLabel: 'MATERIA',
          title: item.subjectName,
          headline: { label: 'Código', value: item.subjectCode },
          splitLeft: { label: 'Grupo', value: `Grupo ${item.groupCode}` },
          splitRight: { label: 'Gestión', value: item.academicTerm },
          primaryMeta: { label: 'Docente', value: item.teacherFullName },
          secondaryMeta: { label: 'Correo', value: item.teacherEmail },
        })}
        data={filteredSubjects}
        loading={records.loading}
        error={records.error}
        pagination={records.pagination}
        onPageChange={records.onPageChange}
        onRetry={records.reload}
        pageSize={10}
        labelWidth="92px"
        entityLabel="materias inscritas"
        searchPlaceholder="Buscar por materia, código o docente"
        onSearch={setSearchQuery}
        emptyTitle="Sin materias inscritas en la gestión actual"
        emptyDescription="El estudiante no registra inscripciones activas o no existen coincidencias con la búsqueda."
      />
    </Stack>
  )
}
