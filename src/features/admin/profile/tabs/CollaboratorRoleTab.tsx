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
 * CONTRATO DE BACKEND PARA "ROL COLABORADOR"
 * ============================================================================
 * 1. Endpoint sugerido:
 *    GET /api/v1/admin/students/{studentId}/collaborations
 *    (O a nivel usuario: GET /api/v1/admin/users/{userId}/collaborations)
 *
 * 2. Parámetros de consulta (Query Params):
 *    - status?: 'ACTIVE' | 'COMPLETED' (Permite filtrar o traer todas para filtrado local)
 *    - search?: string (Filtra por materia, código, docente, correo, grupo o tipo de examen)
 *    - page?: number
 *    - per_page?: number (10 por defecto para la grilla 2x5)
 *
 * 3. Modelos de Base de Datos / Laravel involucrados:
 *    - ExamCollaborator (user_id, exam_id, assigned_by, created_at)
 *    - Exam (evaluation_type, exam_date, status)
 *    - CourseOffering (group_code, subject_id, teacher_id, academic_term_id)
 *    - Subject (name, code)
 *    - Teacher (first_names, last_names, email)
 *
 * 4. Estructura JSON esperada en la respuesta (Response 200 OK):
 *    {
 *      "data": [
 *        {
 *          "id": 301,
 *          "subject_name": "Base de Datos I",
 *          "subject_code": "2006032",
 *          "group_code": "2",
 *          "teacher_full_name": "Ing. Daniel Flores Condarco",
 *          "teacher_email": "demo1@umss.edu.bo",
 *          "evaluation_type": "FIRST_PARTIAL",
 *          "evaluation_type_label": "Primer parcial",
 *          "assigned_at": "15/10/2026 - 09:30",
 *          "collaboration_status": "ACTIVE" // 'ACTIVE' (Activas) | 'COMPLETED' (Concluidas)
 *        }
 *      ],
 *      "meta": {
 *        "current_page": 1,
 *        "last_page": 1,
 *        "total": 5
 *      }
 *    }
 * ============================================================================
 */

export type ExamEvaluationTypeLabel =
  | 'Primer parcial'
  | 'Segundo parcial'
  | 'Examen final'
  | 'Segunda instancia'

export type CollaborationTabFilter = 'ACTIVE' | 'COMPLETED'

interface CollaboratorAssignmentItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  groupCode: string
  teacherFullName: string
  teacherEmail: string
  examType: ExamEvaluationTypeLabel
  assignedAt: string
  collaborationStatus: CollaborationTabFilter
}

const MOCK_COLLABORATOR_ASSIGNMENTS: readonly CollaboratorAssignmentItem[] = [
  // DESIGNACIONES ACTIVAS
  {
    id: 301,
    subjectName: 'Base de Datos I',
    subjectCode: '2006032',
    groupCode: '2',
    teacherFullName: 'Ing. Daniel Flores Condarco',
    teacherEmail: 'demo1@umss.edu.bo',
    examType: 'Primer parcial',
    assignedAt: '15/10/2026 - 09:30',
    collaborationStatus: 'ACTIVE',
  },
  {
    id: 302,
    subjectName: 'Elementos de Programación y Estructura de Datos',
    subjectCode: '2006025',
    groupCode: '1',
    teacherFullName: 'Ing. Joel Fernandez Cordoba',
    teacherEmail: 'demo2@umss.edu.bo',
    examType: 'Segundo parcial',
    assignedAt: '18/10/2026 - 11:00',
    collaborationStatus: 'ACTIVE',
  },
  // DESIGNACIONES CONCLUIDAS (HISTORIAL)
  {
    id: 303,
    subjectName: 'Introducción a la Programación',
    subjectCode: '2006018',
    groupCode: '1',
    teacherFullName: 'Ing. Patricia Erika Rodriguez Bilbao',
    teacherEmail: 'p.rodriguez@umss.edu.bo',
    examType: 'Examen final',
    assignedAt: '12/06/2026 - 14:20',
    collaborationStatus: 'COMPLETED',
  },
  {
    id: 304,
    subjectName: 'Introducción a la Programación',
    subjectCode: '2006018',
    groupCode: '1',
    teacherFullName: 'Ing. Patricia Erika Rodriguez Bilbao',
    teacherEmail: 'p.rodriguez@umss.edu.bo',
    examType: 'Segunda instancia',
    assignedAt: '25/06/2026 - 08:45',
    collaborationStatus: 'COMPLETED',
  },
  {
    id: 305,
    subjectName: 'Cálculo I',
    subjectCode: '2008011',
    groupCode: '4',
    teacherFullName: 'Ing. Juan Jose Arnez',
    teacherEmail: 'demo3@umss.edu.bo',
    examType: 'Primer parcial',
    assignedAt: '10/04/2026 - 16:00',
    collaborationStatus: 'COMPLETED',
  },
]

export function CollaboratorRoleTab({ entity }: ProfileTabComponentProps) {
  const [selectedTab, setSelectedTab] =
    useState<CollaborationTabFilter>('ACTIVE')
  const [searchQuery, setSearchQuery] = useState('')
  
  const totalActiveCount = useMemo(
    () =>
      MOCK_COLLABORATOR_ASSIGNMENTS.filter(
        (item) => item.collaborationStatus === 'ACTIVE',
      ).length,
    [],
  )

  const totalCompletedCount = useMemo(
    () =>
      MOCK_COLLABORATOR_ASSIGNMENTS.filter(
        (item) => item.collaborationStatus === 'COMPLETED',
      ).length,
    [],
  )

  // Filtrado por pestaña ("Activas" vs "Concluidas")
  const filteredCollaborations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return MOCK_COLLABORATOR_ASSIGNMENTS.filter((item) => {
      if (item.collaborationStatus !== selectedTab) return false
      if (!query) return true

      return (
        item.subjectName.toLowerCase().includes(query) ||
        item.subjectCode.toLowerCase().includes(query) ||
        item.teacherFullName.toLowerCase().includes(query) ||
        item.teacherEmail.toLowerCase().includes(query) ||
        item.examType.toLowerCase().includes(query) ||
        item.groupCode.toLowerCase().includes(query) ||
        item.assignedAt.toLowerCase().includes(query)
      )
    })
  }, [selectedTab, searchQuery])

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
        id: 'groupAndExam',
        label: 'Grupo',
        cell: (item) => (
          <div className={cardStyles.inlinePairedRow}>
            <span className={cardStyles.fullWidthPillGray}>
              Grupo {item.groupCode}
            </span>
            <span className={cardStyles.inlineSecondaryLabel}>Examen</span>
            <span className={layoutStyles.examTypeBadge}>{item.examType}</span>
          </div>
        ),
      },
      {
        id: 'assignedAt',
        label: 'Designación',
        accessorKey: 'assignedAt',
      },
    ],
    [],
  )

  const isShowingActive = selectedTab === 'ACTIVE'

  return (
    <section className={layoutStyles.sectionCard}>
      <div className={layoutStyles.sectionHeaderRow}>
        <div className={layoutStyles.sectionTitleGroup}>
          <h2>Rol colaborador en control de exámenes</h2>
          <p>
            {isShowingActive
              ? `Designaciones vigentes donde ${entity.first_names} ${entity.last_names} es colaborador actualmente.`
              : `Historial de evaluaciones pasadas donde ${entity.first_names} ${entity.last_names} fue colaborador.`}
          </p>
        </div>

        {/* SELECTOR DE PESTAÑAS FRONTEND ("Activas" / "Concluidas") */}
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

      <DataCardGrid
        key={selectedTab}
        fields={cardFields}
        data={filteredCollaborations}
        loading={false}
        pageSize={10}
        labelWidth="92px"
        entityLabel={
          isShowingActive
            ? 'colaboraciones activas'
            : 'colaboraciones concluidas'
        }
        searchPlaceholder={
          isShowingActive
            ? 'Buscar en colaboraciones activas por materia, código, docente o examen...'
            : 'Buscar en colaboraciones concluidas por materia, código, docente o examen...'
        }
        initialSearch={searchQuery}
        onSearch={setSearchQuery}
        emptyTitle={
          isShowingActive
            ? 'Sin colaboraciones activas'
            : 'Sin colaboraciones concluidas'
        }
        emptyDescription={
          isShowingActive
            ? 'El estudiante no tiene designaciones activas como colaborador en este momento.'
            : 'No se encontraron registros históricos de colaboración para este estudiante.'
        }
      />
    </section>
  )
}