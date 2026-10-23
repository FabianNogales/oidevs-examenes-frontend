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
 * CONTRATO DE BACKEND PARA "ROL COLABORADOR" (ESTUDIANTE / DOCENTE / USUARIO)
 * ============================================================================
 * 1. Endpoint sugerido:
 *    GET /api/v1/admin/users/{userId}/collaborations
 *    (O por rol: GET /api/v1/admin/students/{studentId}/collaborations
 *                GET /api/v1/admin/teachers/{teacherId}/collaborations)
 *
 * 2. Parámetros de consulta (Query Params / Inputs requeridos):
 *    - status?: 'ACTIVE' | 'COMPLETED'
 *    - search?: string (Filtra por materia, código, docente, correo, grupo, gestión o examen)
 *    - page?: number
 *    - per_page?: number (10 por defecto para la grilla 2x5)
 *
 * 3. Modelos de Base de Datos / Laravel involucrados:
 *    - ExamCollaborator (user_id, exam_id, assigned_by, created_at)
 *    - Exam (evaluation_type, exam_date, status)
 *    - CourseOffering (group_code, subject_id, teacher_id, academic_term_id)
 *    - Subject (name, code)
 *    - Teacher (first_names, last_names, email)
 *    - AcademicTerm (name)
 * ============================================================================
 */

export type ExamEvaluationTypeLabel =
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

const MOCK_COLLABORATOR_ASSIGNMENTS: readonly CollaboratorAssignmentItem[] = [
  // DESIGNACIONES ACTIVAS
  {
    id: 301,
    subjectName: 'Base de Datos I',
    subjectCode: '2006032',
    groupCode: '2',
    academicTerm: 'II/2026',
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
    academicTerm: 'II/2026',
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
    academicTerm: 'I/2026',
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
    academicTerm: 'I/2026',
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
    academicTerm: 'I/2026',
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
        item.academicTerm.toLowerCase().includes(query) ||
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
              : `Historial de evaluaciones pasadas donde ${entity.first_names} ${entity.last_names} fue colaborador.`}
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
            ? 'Buscar en colaboraciones activas por materia, código, docente, gestión o examen...'
            : 'Buscar en colaboraciones concluidas por materia, código, docente, gestión o examen...'
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
            ? `Actualmente ${entityRoleLabel} no tiene designaciones activas como colaborador.`
            : `No se encontraron registros históricos de colaboración para ${entityRoleLabel}.`
        }
      />
    </section>
  )
}