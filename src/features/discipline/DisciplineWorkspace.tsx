import { CaseExport } from './CaseExport'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { ButtonLink } from '@/shared/components/ui/Button/ButtonLink'
import { Field } from '@/shared/components/ui/Field/Field'
import { Select } from '@/shared/components/ui/Field/Select'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { ExamIncidentNavigation } from '@/features/incidents/components/ExamIncidentNavigation'
import { useInfractionResource } from '@/features/infractions/hooks/useInfractionResource'
import { formatIncidentDate } from '@/features/incidents/utils/incidentDisplay'
import { listCases, type DisciplineCase } from './disciplineApi'
import { caseTypeLabel, caseStatusLabel } from './caseLabels'

type Row = Omit<DisciplineCase, 'status'> & { case_status: string }
const columns: TableColumnDef<Row>[] = [
  {
    id: 'case',
    header: 'Caso / motivo',
    cell: (row) => (
      <>
        <strong>
          #{row.id} · {caseTypeLabel(row.type)}
        </strong>
        <p>
          {row.kind === 'INFRACTION'
            ? 'Infracción'
            : row.kind === 'LEGACY_EXPULSION'
              ? 'Medida histórica'
              : 'Incidencia'}
        </p>
      </>
    ),
  },
  {
    id: 'student',
    header: 'Estudiante',
    cell: (row) =>
      row.student
        ? `${row.student.first_names} ${row.student.last_names}`
        : 'Sin identificar',
  },
  {
    id: 'case_status',
    header: 'Estado',
    cell: (row) => caseStatusLabel(row.case_status),
  },
  {
    id: 'measure',
    header: 'Medida',
    cell: (row) => (row.measure_applied ? 'Expulsado' : 'Solo registro'),
  },
  {
    id: 'date',
    header: 'Fecha y hora',
    cell: (row) => formatIncidentDate(row.occurred_at),
  },
]
export function DisciplineWorkspace({ examId }: { examId: number }) {
  const [params, setParams] = useSearchParams()
  const page = params.get('page') ?? '1',
    kind = params.get('kind') ?? '',
    measure = params.get('measure') ?? '',
    search = params.get('search') ?? ''
  const query = useInfractionResource(
    `cases:${examId}:${page}:${kind}:${measure}:${search}`,
    useCallback(
      (signal) => listCases(examId, { page, kind, measure, search }, signal),
      [examId, page, kind, measure, search],
    ),
  )
  const setFilter = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set(key, value)
      next.set('page', '1')
      return next
    })
  const permissions = query.data?.permissions
  return (
    <main>
      <PageContainer labelledBy="discipline-title">
        <PageHeader
          title="Incidencias e infracciones"
          titleId="discipline-title"
          description={
            query.data
              ? `${query.data.exam.name} · ${query.data.exam.subject_name}`
              : undefined
          }
          breadcrumbs={[
            {
              label: permissions?.can_manage
                ? 'Mis exámenes'
                : 'Control de ingreso',
              to: permissions?.can_manage
                ? '/teacher/exams'
                : `/exams/${examId}/entry-control`,
            },
            { label: 'Incidencias e infracciones' },
          ]}
          actions={
            permissions?.can_create && (
              <ButtonLink to={`/exams/${examId}/incidents/create`}>
                Registrar incidencia o infracción
              </ButtonLink>
            )
          }
        />
        {permissions?.can_manage && <ExamIncidentNavigation examId={examId} />}
        {permissions?.can_export && (
          <CaseExport examId={examId} filters={{ kind, measure, search }} />
        )}
        <DataTable<Row>
          columns={columns}
          data={
            query.data?.data.map(({ status, ...row }) => ({
              ...row,
              case_status: status,
            })) ?? []
          }
          loading={query.loading}
          error={query.error}
          onRetry={query.retry}
          entityLabel="casos"
          viewActionLabel="Ver caso"
          getProfilePath={(row) => `/exams/${examId}/cases/${row.id}`}
          emptyTitle="No hay casos registrados"
          emptyDescription="Los registros aparecerán aquí según los filtros seleccionados."
          initialSearch={search}
          onSearch={(value) => setFilter('search', value)}
          searchPlaceholder="Buscar por estudiante o descripción"
          pagination={
            query.data
              ? {
                  currentPage: query.data.meta.current_page,
                  lastPage: query.data.meta.last_page,
                  total: query.data.meta.total,
                }
              : null
          }
          onPageChange={(value) =>
            setParams((current) => {
              const next = new URLSearchParams(current)
              next.set('page', String(value))
              return next
            })
          }
          filters={
            <>
              <Field label="Tipo">
                {(control) => (
                  <Select
                    {...control}
                    value={kind}
                    onChange={(event) => setFilter('kind', event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="INCIDENT">Incidencias</option>
                    {permissions?.can_manage && (
                      <>
                        <option value="INFRACTION">Infracciones</option>
                        <option value="LEGACY_EXPULSION">
                          Medidas históricas sin caso
                        </option>
                      </>
                    )}
                  </Select>
                )}
              </Field>
              <Field label="Medida">
                {(control) => (
                  <Select
                    {...control}
                    value={measure}
                    onChange={(event) =>
                      setFilter('measure', event.target.value)
                    }
                  >
                    <option value="">Todas</option>
                    <option value="EXPELLED">Expulsado</option>
                    <option value="NONE">Solo registro</option>
                  </Select>
                )}
              </Field>
            </>
          }
        />
      </PageContainer>
    </main>
  )
}
