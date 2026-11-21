import { useCallback, useState } from 'react'
import { Dropdown } from '@/shared/components/ui/Dropdown'
import { SearchBar } from '@/shared/components/ui/SearchBar'
import { DataTable } from '@/shared/components/DataTable/DataTable'
import type { TableColumnDef } from '@/shared/components/DataTable/dataTable.types'
import { useInfractionResource } from '@/features/infractions/hooks/useInfractionResource'
import { getReportCatalog } from '../api/examReportsApi'
import type { ReportExam, ReportCatalogQuery } from '../types/report.types'
import styles from '../pages/ExamReports.module.css'
type Row = Omit<ReportExam, 'status'> & { exam_status: string }
const columns: TableColumnDef<Row>[] = [
  { id: 'exam', header: 'Examen', cell: (e) => e.name },
  {
    id: 'subject',
    header: 'Materia',
    cell: (e) => (
      <>
        {e.subject.name}
        <small className={styles.secondary}>{e.subject.code}</small>
      </>
    ),
  },
  {
    id: 'period',
    header: 'Periodo académico',
    cell: (e) => e.academic_term.name,
  },
  {
    id: 'date',
    header: 'Fecha',
    cell: (e) => e.exam_date.split('-').reverse().join('/'),
  },
]
export function ReportExamCatalog({
  onSelect,
}: {
  onSelect: (exam: ReportExam) => void
}) {
  const [search, setSearch] = useState(''),
    [subject, setSubject] = useState(''),
    [term, setTerm] = useState(''),
    [query, setQuery] = useState<ReportCatalogQuery>({ search: '', page: 1 })
  const key = JSON.stringify(query),
    load = useCallback(
      (signal: AbortSignal) =>
        getReportCatalog(JSON.parse(key) as ReportCatalogQuery, signal),
      [key],
    )
  const q = useInfractionResource(`report-catalog:${key}`, load),
    r = q.data
  function applyQuery(
    nextSearch: string,
    nextSubject = subject,
    nextTerm = term,
  ) {
    setQuery({
      search: nextSearch,
      page: 1,
      ...(nextSubject ? { subject_id: Number(nextSubject) } : {}),
      ...(nextTerm ? { academic_term_id: Number(nextTerm) } : {}),
    })
  }
  return (
    <section className={styles.panel}>
      <h2>Selecciona un examen</h2>
      <p>
        Solo se mostrarán los exámenes y reportes autorizados para tu cuenta.
      </p>
      <div className={styles.catalogFilters}>
        <SearchBar
          value={search}
          onChange={setSearch}
          onSubmit={(nextSearch) => applyQuery(nextSearch)}
          onClear={() => {
            setSearch('')
            applyQuery('')
          }}
          label="Buscar examen"
          showLabel
          placeholder="Nombre del examen"
          loading={q.loading}
          showClear={Boolean(query.search)}
        />
        <div
          className={styles.catalogFilterRow}
          role="group"
          aria-label="Filtros de catálogo"
        >
          <label>
            Materia
            <Dropdown<string | number>
              value={subject}
              disabled={q.loading}
              options={[
                { value: '', label: 'Todas las materias' },
                ...(!r && subject
                  ? [{ value: subject, label: 'Materia seleccionada' }]
                  : []),
                ...(r?.filters.subjects.map((o) => ({
                  value: o.id,
                  label: o.name,
                })) ?? []),
              ]}
              onChange={(nextSubject) => {
                const value = String(nextSubject)
                setSubject(value)
                applyQuery(search.trim(), value, term)
              }}
            />
          </label>
          <label>
            Periodo académico
            <Dropdown<string | number>
              value={term}
              disabled={q.loading}
              options={[
                { value: '', label: 'Todos los periodos' },
                ...(!r && term
                  ? [{ value: term, label: 'Periodo seleccionado' }]
                  : []),
                ...(r?.filters.academic_terms.map((o) => ({
                  value: o.id,
                  label: o.name,
                })) ?? []),
              ]}
              onChange={(nextTerm) => {
                const value = String(nextTerm)
                setTerm(value)
                applyQuery(search.trim(), subject, value)
              }}
            />
          </label>
        </div>
      </div>
      <DataTable<Row>
        columns={columns}
        data={(r?.data ?? []).map(({ status, ...e }) => ({
          ...e,
          exam_status: status,
        }))}
        loading={q.loading}
        error={q.error}
        onRetry={q.retry}
        entityLabel="exámenes"
        viewActionLabel="Seleccionar examen"
        onViewProfile={(e) => onSelect({ ...e, status: e.exam_status })}
        emptyTitle="No hay exámenes para estos filtros"
        emptyDescription="Prueba otra búsqueda, materia o periodo académico."
        pagination={
          r
            ? {
                currentPage: r.meta.current_page,
                lastPage: r.meta.last_page,
                total: r.meta.total,
              }
            : null
        }
        onPageChange={(page) => setQuery((old) => ({ ...old, page }))}
      />
    </section>
  )
}
