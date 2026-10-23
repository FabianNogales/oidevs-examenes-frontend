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
 * CONTRATO DE BACKEND PARA "HISTORIAL DE MATERIAS DICTADAS"
 * ============================================================================
 * 1. Endpoint sugerido:
 *    GET /api/v1/admin/teachers/{teacherId}/course-offerings/history
 *    (Alternativa: GET /api/v1/admin/teachers/{teacherId}/course-offerings?term_status=CLOSED)
 *
 * 2. Parámetros de consulta (Query Params / Inputs requeridos):
 *    - search?: string (Filtra por materia, código, grupo, gestión, tipo de grupo o carrera)
 *    - academic_term_id?: number (Opcional para filtrar por gestión específica)
 *    - page?: number
 *    - per_page?: number (10 por defecto para la grilla 2x5)
 *
 * 3. Modelos de Base de Datos / Laravel involucrados:
 *    - CourseOffering (id, group_code, teacher_id, subject_id, academic_term_id)
 *    - Subject (id, name, code)
 *    - Career (relación `career_subject` para obtener carreras del grupo)
 *    - AcademicTerm (gestiones cerradas/culminadas, ej. "I/2026", "II/2025")
 *
 * 4. Estructura JSON esperada en la respuesta (Response 200 OK):
 *    {
 *      "data": [
 *        {
 *          "id": 601,
 *          "subject_name": "Ingeniería de Software",
 *          "subject_code": "2006042",
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

interface TeacherSubjectHistoryItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  groupCode: string
  academicTerm: string
  careers: readonly string[]
}

const MOCK_TEACHER_SUBJECT_HISTORY: readonly TeacherSubjectHistoryItem[] = [
  {
    id: 601,
    subjectName: 'Ingeniería de Software',
    subjectCode: '2006042',
    groupCode: '1',
    academicTerm: 'I/2026',
    careers: ['Ing. Informática', 'Ing. de Sistemas'],
  },
  {
    id: 602,
    subjectName: 'Base de Datos II',
    subjectCode: '2006038',
    groupCode: '2',
    academicTerm: 'I/2026',
    careers: ['Ing. de Sistemas'],
  },
  {
    id: 603,
    subjectName: 'Elementos de Programación y Estructura de Datos',
    subjectCode: '2006025',
    groupCode: '3',
    academicTerm: 'II/2025',
    careers: ['Ing. Informática', 'Ing. de Sistemas'],
  },
  {
    id: 604,
    subjectName: 'Introducción a la Programación',
    subjectCode: '2006018',
    groupCode: '1',
    academicTerm: 'I/2025',
    careers: ['Ing. Informática'],
  },
]

function getGroupTypeLabel(careersCount: number): 'Grupo mixto' | 'Grupo individual' {
  return careersCount > 1 ? 'Grupo mixto' : 'Grupo individual'
}

export function TeacherSubjectHistoryTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return MOCK_TEACHER_SUBJECT_HISTORY

    return MOCK_TEACHER_SUBJECT_HISTORY.filter((item) => {
      const groupType = getGroupTypeLabel(item.careers.length).toLowerCase()
      const careersString = item.careers.join(' - ').toLowerCase()

      return (
        item.subjectName.toLowerCase().includes(query) ||
        item.subjectCode.toLowerCase().includes(query) ||
        item.groupCode.toLowerCase().includes(query) ||
        item.academicTerm.toLowerCase().includes(query) ||
        groupType.includes(query) ||
        careersString.includes(query)
      )
    })
  }, [searchQuery])

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
        loading={false}
        pageSize={10}
        labelWidth="92px"
        entityLabel="materias históricas"
        searchPlaceholder="Buscar por materia, código, grupo, gestión (ej. I/2026) o carrera..."
        onSearch={setSearchQuery}
        emptyTitle="Sin historial de materias dictadas"
        emptyDescription="No se encontraron asignaturas impartidas en gestiones anteriores con ese criterio."
      />
    </section>
  )
}