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
 * CONTRATO DE BACKEND PARA "HISTORIAL DE MATERIAS"
 * ============================================================================
 * 1. Endpoint sugerido:
 *    GET /api/v1/admin/students/{studentId}/enrollments/history
 *
 * 2. Parámetros de consulta (Query Params):
 *    - search?: string (Filtra por materia, código, docente, gestión o estado)
 *    - academic_term_id?: number (Opcional para filtrar por gestión específica)
 *    - approval_status?: 'APPROVED' | 'FAILED'
 *    - page?: number
 *    - per_page?: number (10 por defecto para la grilla 2x5)
 *
 * 3. Modelos de Base de Datos / Laravel involucrados:
 *    - Enrollment (requiere atributo o cálculo de estado final: 'APPROVED' | 'FAILED')
 *    - CourseOffering (relación con Subject, Teacher y AcademicTerm cerrados)
 *    - Subject (name, code), Teacher (first_names, last_names, email), AcademicTerm
 *
 * 4. Estructura JSON esperada en la respuesta (Response 200 OK):
 *    {
 *      "data": [
 *        {
 *          "id": 201,
 *          "subject_name": "Ingeniería de Software",
 *          "subject_code": "2006042",
 *          "group_code": "1",
 *          "teacher_full_name": "Ing. Daniel Flores Condarco",
 *          "teacher_email": "demo1@umss.edu.bo",
 *          "academic_term": "I/2026",
 *          "approval_status": "APPROVED" // 'APPROVED' | 'FAILED'
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

type SubjectApprovalStatus = 'APPROVED' | 'FAILED'

interface SubjectHistoryItem extends BaseTableEntity {
  id: number
  subjectName: string
  subjectCode: string
  groupCode: string
  teacherFullName: string
  teacherEmail: string
  academicTerm: string
  approvalStatus: SubjectApprovalStatus
}

const MOCK_SUBJECT_HISTORY: readonly SubjectHistoryItem[] = [
  {
    id: 201,
    subjectName: 'Ingeniería de Software',
    subjectCode: '2006042',
    groupCode: '1',
    teacherFullName: 'Ing. Daniel Flores Condarco',
    teacherEmail: 'demo1@umss.edu.bo',
    academicTerm: 'I/2026',
    approvalStatus: 'APPROVED',
  },
  {
    id: 202,
    subjectName: 'Base de Datos II',
    subjectCode: '2006038',
    groupCode: '2',
    teacherFullName: 'Ing. Joel Fernandez Cordoba',
    teacherEmail: 'demo2@umss.edu.bo',
    academicTerm: 'I/2026',
    approvalStatus: 'APPROVED',
  },
  {
    id: 203,
    subjectName: 'Arquitectura de Computadoras',
    subjectCode: '2006031',
    groupCode: '1',
    teacherFullName: 'Ing. Juan Jose Arnez',
    teacherEmail: 'demo3@umss.edu.bo',
    academicTerm: 'II/2025',
    approvalStatus: 'FAILED',
  },
  {
    id: 204,
    subjectName: 'Arquitectura de Computadoras',
    subjectCode: '2006031',
    groupCode: '2',
    teacherFullName: 'Ing. Juan Jose Arnez',
    teacherEmail: 'demo3@umss.edu.bo',
    academicTerm: 'I/2026',
    approvalStatus: 'APPROVED',
  },
  {
    id: 205,
    subjectName: 'Estructura de Datos',
    subjectCode: '2006025',
    groupCode: '3',
    teacherFullName: 'Ing. Patricia Erika Rodriguez Bilbao',
    teacherEmail: 'p.rodriguez@umss.edu.bo',
    academicTerm: 'II/2025',
    approvalStatus: 'APPROVED',
  },
]

export function StudentSubjectHistoryTab({ entity }: ProfileTabComponentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return MOCK_SUBJECT_HISTORY

    return MOCK_SUBJECT_HISTORY.filter((item) => {
      const statusText =
        item.approvalStatus === 'APPROVED' ? 'aprobado' : 'reprobado'
      return (
        item.subjectName.toLowerCase().includes(query) ||
        item.subjectCode.toLowerCase().includes(query) ||
        item.teacherFullName.toLowerCase().includes(query) ||
        item.teacherEmail.toLowerCase().includes(query) ||
        item.groupCode.toLowerCase().includes(query) ||
        item.academicTerm.toLowerCase().includes(query) ||
        statusText.includes(query)
      )
    })
  }, [searchQuery])

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
        cell: (item) => {
          const isApproved = item.approvalStatus === 'APPROVED'
          return (
            <span
              className={`${tableStyles.statusBadge} ${
                isApproved ? tableStyles.statusActive : tableStyles.statusInactive
              }`}
            >
              <span className={tableStyles.statusDot} aria-hidden="true" />
              {isApproved ? 'Aprobado' : 'Reprobado'}
            </span>
          )
        },
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
            en gestiones anteriores y su resultado final.
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
        searchPlaceholder="Buscar por materia, código, docente, gestión (ej. I/2026) o resultado..."
        onSearch={setSearchQuery}
        emptyTitle="Sin historial académico registrado"
        emptyDescription="No se encontraron materias cursadas en gestiones pasadas con ese criterio."
      />
    </section>
  )
}