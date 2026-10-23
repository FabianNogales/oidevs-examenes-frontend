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
 * CONTRATO DE BACKEND PARA "MATERIAS QUE DICTA" (GESTIÓN ACTUAL)
 * ============================================================================
 * 1. Endpoint sugerido:
 *    GET /api/v1/admin/teachers/{teacherId}/course-offerings/current
 *    (Alternativa: GET /api/v1/admin/teachers/{teacherId}/course-offerings?term_status=ACTIVE)
 *
 * 2. Parámetros de consulta (Query Params / Inputs requeridos):
 *    - search?: string (Filtra por nombre de materia, código, grupo, tipo de grupo o carrera)
 *    - page?: number
 *    - per_page?: number (10 por defecto para la grilla 2x5)
 *
 * 3. Modelos de Base de Datos / Laravel involucrados:
 *    - CourseOffering (id, group_code, teacher_id, subject_id, academic_term_id)
 *    - Subject (id, name, code)
 *    - Career (relación muchos a muchos `career_subject`: obtiene las carreras asociadas)
 *    - AcademicTerm (filtrado donde `is_active = true`, ej. "II/2026")
 *
 * 4. Estructura JSON esperada en la respuesta (Response 200 OK):
 *    {
 *      "data": [
 *        {
 *          "id": 501,
 *          "subject_name": "Taller de Ingeniería de Software",
 *          "subject_code": "2006048",
 *          "group_code": "1",
 *          "academic_term": "II/2026",
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

interface TeacherSubjectItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  groupCode: string
  academicTerm: string
  careers: readonly string[]
}

const MOCK_ACTIVE_TEACHER_SUBJECTS: readonly TeacherSubjectItem[] = [
  {
    id: 501,
    subjectName: 'Taller de Ingeniería de Software',
    subjectCode: '2006048',
    groupCode: '1',
    academicTerm: 'II/2026',
    careers: ['Ing. Informática', 'Ing. de Sistemas'],
  },
  {
    id: 502,
    subjectName: 'Base de Datos I',
    subjectCode: '2006032',
    groupCode: '2',
    academicTerm: 'II/2026',
    careers: ['Ing. de Sistemas'],
  },
  {
    id: 503,
    subjectName: 'Física General (Laboratorio)',
    subjectCode: '2008019',
    groupCode: '1C',
    academicTerm: 'II/2026',
    careers: ['Ing. Informática', 'Ing. de Sistemas', 'Ing. Electrónica'],
  },
  {
    id: 504,
    subjectName: 'Arquitectura de Computadoras',
    subjectCode: '2006031',
    groupCode: '1',
    academicTerm: 'II/2026',
    careers: ['Ing. Informática'],
  },
]

function getGroupTypeLabel(careersCount: number): 'Grupo mixto' | 'Grupo individual' {
  return careersCount > 1 ? 'Grupo mixto' : 'Grupo individual'
}

export function TeacherActiveSubjectsTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return MOCK_ACTIVE_TEACHER_SUBJECTS

    return MOCK_ACTIVE_TEACHER_SUBJECTS.filter((item) => {
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

  const cardFields = useMemo<readonly CardFieldDef<TeacherSubjectItem>[]>(
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
          <h2>Materias que dicta</h2>
          <p>
            Asignaturas y grupos asignados al docente{' '}
            <strong>
              {entity.first_names} {entity.last_names}
            </strong>{' '}
            durante la gestión académica activa.
          </p>
        </div>
        <span className={layoutStyles.termBadge}>Gestión activa: II/2026</span>
      </div>

      <DataCardGrid
        fields={cardFields}
        data={filteredSubjects}
        loading={false}
        pageSize={10}
        labelWidth="92px"
        entityLabel="materias activas"
        searchPlaceholder="Buscar por materia, código, grupo, tipo (mixto/individual) o carrera..."
        onSearch={setSearchQuery}
        emptyTitle="Sin materias asignadas en la gestión actual"
        emptyDescription="El docente no registra grupos activos o no existen coincidencias con la búsqueda."
      />
    </section>
  )
}