import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import cardStyles from '@/shared/components/DataCardGrid/DataCardGrid.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'

/**
 * ============================================================================
 * CONTRATO DE BACKEND PARA "MATERIAS ACTUALES"
 * ============================================================================
 * 1. Endpoint sugerido:
 *    GET /api/v1/admin/students/{studentId}/enrollments/current
 *
 * 2. Parámetros de consulta (Query Params):
 *    - search?: string (Filtra por materia, código, grupo o docente)
 *    - page?: number
 *    - per_page?: number (10 por defecto para la grilla 2x5)
 *
 * 3. Modelos de Base de Datos / Laravel involucrados:
 *    - Enrollment, CourseOffering, Subject, Teacher, AcademicTerm
 * ============================================================================
 */

interface CurrentSubjectEnrollmentItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  groupCode: string
  teacherFullName: string
  teacherEmail: string
  academicTerm: string
}

const MOCK_CURRENT_SUBJECTS: readonly CurrentSubjectEnrollmentItem[] = [
  {
    id: 101,
    subjectName: 'Taller de Ingeniería de Software',
    subjectCode: '2006048',
    groupCode: '1',
    teacherFullName: 'Ing. Patricia Erika Rodriguez Bilbao',
    teacherEmail: 'p.rodriguez@umss.edu.bo',
    academicTerm: 'II/2026',
  },
  {
    id: 102,
    subjectName: 'Física General (Laboratorio)',
    subjectCode: '2008019',
    groupCode: '1C',
    teacherFullName: 'Ing. Daniel Flores Condarco',
    teacherEmail: 'demo1@umss.edu.bo',
    academicTerm: 'II/2026',
  },
  {
    id: 103,
    subjectName: 'Inteligencia Artificial I',
    subjectCode: '2006041',
    groupCode: '2',
    teacherFullName: 'Ing. Joel Fernandez Cordoba',
    teacherEmail: 'demo2@umss.edu.bo',
    academicTerm: 'II/2026',
  },
  {
    id: 104,
    subjectName: 'Sistemas de Información II',
    subjectCode: '2006039',
    groupCode: '2C',
    teacherFullName: 'Ing. Juan Jose Arnez',
    teacherEmail: 'demo3@umss.edu.bo',
    academicTerm: 'II/2026',
  },
]

export function StudentCurrentSubjectsTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return MOCK_CURRENT_SUBJECTS

    return MOCK_CURRENT_SUBJECTS.filter(
      (item) =>
        item.subjectName.toLowerCase().includes(query) ||
        item.subjectCode.toLowerCase().includes(query) ||
        item.teacherFullName.toLowerCase().includes(query) ||
        item.groupCode.toLowerCase().includes(query) ||
        item.academicTerm.toLowerCase().includes(query),
    )
  }, [searchQuery])

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
        <span
          className={`${layoutStyles.subSectionBadgeCount} ${layoutStyles.badgeCountActive}`}
        >
          Periodo activo: II/2026
        </span>
      </div>

      <DataCardGrid
        fields={cardFields}
        data={filteredSubjects}
        loading={false}
        pageSize={10}
        labelWidth="92px"
        entityLabel="materias inscritas"
        searchPlaceholder="Buscar por materia, código, grupo (ej. 1, 1C) o docente..."
        onSearch={setSearchQuery}
        emptyTitle="Sin materias inscritas en la gestión actual"
        emptyDescription="El estudiante no registra inscripciones activas o no existen coincidencias con la búsqueda."
      />
    </section>
  )
}