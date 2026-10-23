import { useState, useMemo } from 'react'
import { DataCardGrid } from '@/shared/components/DataCardGrid/DataCardGrid'
import type { CardFieldDef } from '@/shared/components/DataCardGrid/dataCardGrid.types'
import cardStyles from '@/shared/components/DataCardGrid/DataCardGrid.module.css'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type { BaseTableEntity } from '@/shared/components/DataTable/dataTable.types'
import layoutStyles from '../components/EntityProfileLayout.module.css'
import type { ProfileTabComponentProps } from '../types/entityProfile.types'
import type { TeacherExamTypeLabel } from './TeacherActiveExamsTab'

/**
 * ============================================================================
 * CONTRATO DE BACKEND PARA "HISTORIAL DE EXÁMENES" (DOCENTE)
 * ============================================================================
 * 1. Endpoint sugerido:
 *    GET /api/v1/admin/teachers/{teacherId}/exams/history
 *    (Alternativa: GET /api/v1/admin/teachers/{teacherId}/exams?status=COMPLETED)
 *
 * 2. Parámetros de consulta (Query Params / Inputs requeridos):
 *    - search?: string (Filtra por materia, fecha, tipo de examen, grupo, gestión o carrera)
 *    - academic_term_id?: number (Opcional para filtrar por gestión específica)
 *    - evaluation_type?: 'FIRST_PARTIAL' | 'SECOND_PARTIAL' | 'FINAL' | 'SECOND_INSTANCE' | 'TABLE_EXAM'
 *    - page?: number
 *    - per_page?: number (10 por defecto para la grilla 2x5)
 *
 * 3. Modelos de Base de Datos / Laravel involucrados:
 *    - Exam (id, course_offering_id, evaluation_type, exam_date, start_time, status)
 *      * Filtrado por exámenes cuya fecha programada ya culminó.
 *    - CourseOffering (group_code, subject_id, teacher_id, academic_term_id)
 *    - Subject (name, code)
 *    - Career (relación `career_subject` para obtener las carreras asociadas al grupo)
 *    - AcademicTerm (name, ej. "I/2026", "II/2025")
 *
 * 4. Estructura JSON esperada en la respuesta (Response 200 OK):
 *    {
 *      "data": [
 *        {
 *          "id": 801,
 *          "subject_name": "Ingeniería de Software",
 *          "subject_code": "2006042",
 *          "exam_date": "18/06/2026 - 14:15",
 *          "evaluation_type": "FINAL",
 *          "evaluation_type_label": "Examen final",
 *          "group_code": "1",
 *          "academic_term": "I/2026",
 *          "careers": ["Ing. Informática", "Ing. de Sistemas"]
 *        }
 *      ],
 *      "meta": {
 *        "current_page": 1,
 *        "last_page": 1,
 *        "total": 4
 *      }
 *    }
 * ============================================================================
 */

interface TeacherExamHistoryItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  examDate: string
  examType: TeacherExamTypeLabel
  groupCode: string
  academicTerm: string
  careers: readonly string[]
}

const MOCK_TEACHER_EXAM_HISTORY: readonly TeacherExamHistoryItem[] = [
  {
    id: 801,
    subjectName: 'Ingeniería de Software',
    subjectCode: '2006042',
    examDate: '18/06/2026 - 14:15',
    examType: 'Examen final',
    groupCode: '1',
    academicTerm: 'I/2026',
    careers: ['Ing. Informática', 'Ing. de Sistemas'],
  },
  {
    id: 802,
    subjectName: 'Ingeniería de Software',
    subjectCode: '2006042',
    examDate: '29/06/2026 - 14:15',
    examType: 'Segunda instancia',
    groupCode: '1',
    academicTerm: 'I/2026',
    careers: ['Ing. Informática', 'Ing. de Sistemas'],
  },
  {
    id: 803,
    subjectName: 'Base de Datos II',
    subjectCode: '2006038',
    examDate: '10/05/2026 - 09:45',
    examType: 'Primer parcial',
    groupCode: '2',
    academicTerm: 'I/2026',
    careers: ['Ing. de Sistemas'],
  },
  {
    id: 804,
    subjectName: 'Elementos de Programación y Estructura de Datos',
    subjectCode: '2006025',
    examDate: '05/12/2025 - 11:15',
    examType: 'Mesa',
    groupCode: '3',
    academicTerm: 'II/2025',
    careers: ['Ing. Informática', 'Ing. de Sistemas'],
  },
]

function getGroupTypeLabel(careersCount: number): 'Grupo mixto' | 'Grupo individual' {
  return careersCount > 1 ? 'Grupo mixto' : 'Grupo individual'
}

export function TeacherExamHistoryTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredExamHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return MOCK_TEACHER_EXAM_HISTORY

    return MOCK_TEACHER_EXAM_HISTORY.filter((item) => {
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

  const cardFields = useMemo<readonly CardFieldDef<TeacherExamHistoryItem>[]>(
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
          <h2>Historial de exámenes</h2>
          <p>
            Archivo de evaluaciones culminadas (fechas pasadas) asociadas al
            docente{' '}
            <strong>
              {entity.first_names} {entity.last_names}
            </strong>
            .
          </p>
        </div>
      </div>

      <DataCardGrid
        fields={cardFields}
        data={filteredExamHistory}
        loading={false}
        pageSize={10}
        labelWidth="92px"
        entityLabel="exámenes históricos"
        searchPlaceholder="Buscar por materia, fecha, tipo de examen, grupo, gestión (ej. I/2026) o carrera..."
        onSearch={setSearchQuery}
        emptyTitle="Sin historial de exámenes"
        emptyDescription="No se encontraron evaluaciones finalizadas para este docente con el criterio ingresado."
      />
    </section>
  )
}