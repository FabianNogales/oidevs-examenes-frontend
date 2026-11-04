import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Check,
  Hash,
  UserCheck,
  Users,
} from 'lucide-react'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import tableStyles from '@/shared/components/DataTable/DataTable.module.css'
import type {
  BaseTableEntity,
  TableColumnDef,
} from '@/shared/components/DataTable/dataTable.types'
import type { AssignedStudent, OfflineAssignment } from '../types/offline.types'
import { studentName } from '../utils/offlineRules'
import distStyles from './styles/OfflineDistribution.module.css'

interface StudentTableRow extends BaseTableEntity, AssignedStudent {
  id: number
  number: number
}

const studentColumns: readonly TableColumnDef<StudentTableRow>[] = [
  {
    id: 'number',
    header: 'N.º',
    width: '80px',
    align: 'center',
    cell: (row) => (
      <span className={tableStyles.primaryText}>{row.number}</span>
    ),
  },
  {
    id: 'lastNames',
    header: 'Apellidos',
    width: '34%',
    cell: (row) => (
      <span className={tableStyles.primaryText}>{row.last_names}</span>
    ),
  },
  {
    id: 'firstNames',
    header: 'Nombres',
    width: '34%',
    cell: (row) => (
      <span className={tableStyles.primaryText}>{row.first_names}</span>
    ),
  },
  {
    id: 'sisCode',
    header: 'Código SIS',
    width: '20%',
    align: 'center',
    cell: (row) => (
      <span className={tableStyles.secondaryText}>{row.sis_code}</span>
    ),
  },
]

export function GetResponsibleInitials(
  name: string | null,
  fallbackId: number,
): string {
  if (!name) return `R${fallbackId}`
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((word) => word[0]?.toUpperCase() ?? '').join('')
}

export interface AssignedListStudentsViewProps {
  list: OfflineAssignment
  listPosition: number
  version: number
  subjectName: string
  examName: string
  onBack: () => void
}

// Vista de página para consultar el detalle y los estudiantes de una lista asignada
export function AssignedListStudentsView({
  list,
  listPosition,
  version,
  subjectName,
  examName,
  onBack,
}: AssignedListStudentsViewProps) {
  const [query, setQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const responsibleDisplay =
    list.responsible_name ?? `Responsable ${list.responsible_id}`

  const firstStudent = list.students[0] ?? null
  const lastStudent =
    list.students.length > 0 ? list.students[list.students.length - 1] : null

  const startsWithName = firstStudent
    ? studentName(firstStudent)
    : (list.surname_range.from ?? 'Sin estudiantes asignados')

  const endsWithName = lastStudent
    ? studentName(lastStudent)
    : (list.surname_range.to ?? 'Sin estudiantes asignados')

  const filteredStudents = useMemo<readonly StudentTableRow[]>(() => {
    const words = query.toLocaleLowerCase('es').split(/\s+/).filter(Boolean)
    return list.students
      .map((row, index) => ({
        ...row,
        id: row.student_id,
        number: index + 1,
      }))
      .filter((row) =>
        words.every((word) =>
          `${studentName(row)} ${row.last_names} ${row.first_names} ${row.sis_code}`
            .toLocaleLowerCase('es')
            .includes(word),
        ),
      )
  }, [list.students, query])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [filteredStudents, safePage])

  return (
    <section aria-labelledby="assigned-list-page-title">
      <div className={distStyles.backNavigationRow}>
        <button
          type="button"
          className={distStyles.backButton}
          onClick={onBack}
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>Volver a distribución de listas</span>
        </button>

        <span className={distStyles.preparedBadge}>
          <Check size={14} strokeWidth={2.25} aria-hidden="true" />
          <span>
            Lista {listPosition} · Preparada v{version}
          </span>
        </span>
      </div>

      <div className={distStyles.listDetailHeroCard}>
        <div className={distStyles.listDetailHeroTop}>
          <div className={distStyles.listDetailCollaborator}>
            <div className={distStyles.avatarNavy} aria-hidden="true">
              {GetResponsibleInitials(
                list.responsible_name,
                list.responsible_id,
              )}
            </div>
            <div>
              <span className={distStyles.listEyebrow}>
                COLABORADOR RESPONSABLE · LISTA {listPosition}
              </span>
              <h1 id="assigned-list-page-title">{responsibleDisplay}</h1>
              <p className={distStyles.listDetailSubject}>
                {subjectName} · {examName}
              </p>
            </div>
          </div>
        </div>

        <div className={distStyles.listMetaGrid}>
          <div className={distStyles.listMetaBox}>
            <span className={distStyles.listMetaLabel}>
              <BookOpen size={15} strokeWidth={1.85} aria-hidden="true" />
              <span>Materia y evaluación</span>
            </span>
            <strong className={distStyles.listMetaValue}>{subjectName}</strong>
            <span className={distStyles.listMetaSubvalue}>{examName}</span>
          </div>

          <div className={distStyles.listMetaBox}>
            <span className={distStyles.listMetaLabel}>
              <Hash size={15} strokeWidth={1.85} aria-hidden="true" />
              <span>Número de lista</span>
            </span>
            <strong className={distStyles.listMetaValue}>
              Lista {listPosition} (ID #{list.list_id})
            </strong>
            <span className={distStyles.listMetaSubvalue}>
              {list.student_count}{' '}
              {list.student_count === 1
                ? 'estudiante asignado'
                : 'estudiantes asignados'}
            </span>
          </div>

          <div className={distStyles.listMetaBox}>
            <span className={distStyles.listMetaLabel}>
              <UserCheck size={15} strokeWidth={1.85} aria-hidden="true" />
              <span>Inicia en el estudiante</span>
            </span>
            <strong className={distStyles.listMetaValue}>
              {startsWithName}
            </strong>
            {firstStudent ? (
              <span className={distStyles.listMetaSubvalue}>
                SIS: {firstStudent.sis_code}
              </span>
            ) : null}
          </div>

          <div className={distStyles.listMetaBox}>
            <span className={distStyles.listMetaLabel}>
              <Users size={15} strokeWidth={1.85} aria-hidden="true" />
              <span>Termina en el estudiante</span>
            </span>
            <strong className={distStyles.listMetaValue}>{endsWithName}</strong>
            {lastStudent ? (
              <span className={distStyles.listMetaSubvalue}>
                SIS: {lastStudent.sis_code}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <DataTable
        columns={studentColumns}
        data={paginatedStudents}
        loading={false}
        entityLabel="estudiantes en esta lista"
        searchPlaceholder="Buscar estudiante por apellidos, nombres o código SIS..."
        initialSearch={query}
        onSearch={(nextQuery) => {
          setQuery(nextQuery)
          setCurrentPage(1)
        }}
        onPageChange={setCurrentPage}
        pagination={{
          currentPage: safePage,
          lastPage: totalPages,
          total: filteredStudents.length,
          from:
            filteredStudents.length > 0 ? (safePage - 1) * pageSize + 1 : 0,
          to: Math.min(safePage * pageSize, filteredStudents.length),
        }}
        emptyTitle="No se encontraron estudiantes en esta lista"
        emptyDescription="Intenta con otros términos de búsqueda o verifica los apellidos asignados a este rango."
      />
    </section>
  )
}