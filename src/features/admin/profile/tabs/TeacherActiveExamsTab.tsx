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
 * CONTRATO DE BACKEND PARA "EXÁMENES ACTIVOS" (DOCENTE)
 * ============================================================================
 * 1. Endpoint sugerido:
 *    GET /api/v1/admin/teachers/{teacherId}/exams/active
 *    (Alternativa: GET /api/v1/admin/teachers/{teacherId}/exams?status=UPCOMING)
 *
 * 2. Parámetros de consulta (Query Params / Inputs requeridos):
 *    - search?: string (Filtra por materia, fecha, tipo de examen, grupo, gestión o carrera)
 *    - evaluation_type?: 'FIRST_PARTIAL' | 'SECOND_PARTIAL' | 'FINAL' | 'SECOND_INSTANCE' | 'TABLE_EXAM'
 *    - page?: number
 *    - per_page?: number (10 por defecto para la grilla 2x5)
 *
 * 3. Modelos de Base de Datos / Laravel involucrados:
 *    - Exam (id, course_offering_id, evaluation_type, exam_date, start_time, status)
 *      * Filtrado por exámenes cuya fecha/hora programada aún está vigente.
 *    - CourseOffering (group_code, subject_id, teacher_id, academic_term_id)
 *    - Subject (name, code)
 *    - Career (relación `career_subject` para determinar carreras e inferir grupo mixto/individual)
 *    - AcademicTerm (name, ej. "II/2026")
 *
 * 4. Estructura JSON esperada en la respuesta (Response 200 OK):
 *    {
 *      "data": [
 *        {
 *          "id": 701,
 *          "subject_name": "Taller de Ingeniería de Software",
 *          "subject_code": "2006048",
 *          "exam_date": "28/10/2026 - 14:15",
 *          "evaluation_type": "FIRST_PARTIAL",
 *          "evaluation_type_label": "Primer parcial",
 *          "group_code": "1",
 *          "academic_term": "II/2026",
 *          "careers": ["Ing. Informática", "Ing. de Sistemas"]
 *        }
 *      ],
 *      "meta": {
 *        "current_page": 1,
 *        "last_page": 1,
 *        "total": 3
 *      }
 *    }
 * ============================================================================
 */

export type TeacherExamTypeLabel =
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

const MOCK_ACTIVE_TEACHER_EXAMS: readonly TeacherExamItem[] = [
  {
    id: 701,
    subjectName: 'Taller de Ingeniería de Software',
    subjectCode: '2006048',
    examDate: '28/10/2026 - 14:15',
    examType: 'Primer parcial',
    groupCode: '1',
    academicTerm: 'II/2026',
    careers: ['Ing. Informática', 'Ing. de Sistemas'],
  },
  {
    id: 702,
    subjectName: 'Base de Datos I',
    subjectCode: '2006032',
    examDate: '04/11/2026 - 09:45',
    examType: 'Segundo parcial',
    groupCode: '2',
    academicTerm: 'II/2026',
    careers: ['Ing. de Sistemas'],
  },
  {
    id: 703,
    subjectName: 'Física General (Laboratorio)',
    subjectCode: '2008019',
    examDate: '12/11/2026 - 11:15',
    examType: 'Mesa',
    groupCode: '1C',
    academicTerm: 'II/2026',
    careers: ['Ing. Informática', 'Ing. de Sistemas', 'Ing. Electrónica'],
  },
]

function getGroupTypeLabel(careersCount: number): 'Grupo mixto' | 'Grupo individual' {
  return careersCount > 1 ? 'Grupo mixto' : 'Grupo individual'
}

export function TeacherActiveExamsTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredExams = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return MOCK_ACTIVE_TEACHER_EXAMS

    return MOCK_ACTIVE_TEACHER_EXAMS.filter((item) => {
      const groupType = getGroupTypeLabel(item.careers.length).toLowerCase()
      const careersString = item.careers.join(' - ').toLowerCase()

      return (
        item.subjectName.toLowerCase().includes(query) ||
        item.subjectCode.toLowerCase().includes(query) ||
        item.examDate.toLowerCase().includes(query) ||
        item.examType.toLowerCase().includes(query) ||
        item.groupCode.toLowerCase().includes(query) ||
        item.academicTerm.toLowerCase().includes(query) ||
        groupType.includes(query) ||
        careersString.includes(query)
      )
    })
  }, [searchQuery])

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
        label: 'Tipo grupo',
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
        <span className={layoutStyles.termBadge}>Gestión activa: II/2026</span>
      </div>

      <DataCardGrid
        fields={cardFields}
        data={filteredExams}
        loading={false}
        pageSize={10}
        labelWidth="92px"
        entityLabel="exámenes activos"
        searchPlaceholder="Buscar por materia, fecha, tipo de examen (ej. Primer parcial, Mesa), grupo o carrera..."
        onSearch={setSearchQuery}
        emptyTitle="Sin exámenes activos programados"
        emptyDescription="El docente no tiene evaluaciones pendientes de realización o no hay coincidencias con la búsqueda."
      />
    </section>
  )
}