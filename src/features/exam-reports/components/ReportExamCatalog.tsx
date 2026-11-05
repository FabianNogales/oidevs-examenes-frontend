import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
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
  function submit(e: FormEvent) {
    e.preventDefault()
    setQuery({
      search: search.trim(),
      page: 1,
      ...(subject ? { subject_id: Number(subject) } : {}),
      ...(term ? { academic_term_id: Number(term) } : {}),
    })
  }
  return (
    <section className={styles.panel}>
      <h2>Selecciona un examen</h2>
      <p>
        Solo se mostrarán los exámenes y reportes autorizados para tu cuenta.
      </p>
      <form onSubmit={submit} className={styles.catalogFilters}>
        <label>
          Materia
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={q.loading}
          >
            <option value="">Todas las materias</option>
            {!r && subject && (
              <option value={subject}>Materia seleccionada</option>
            )}
            {r?.filters.subjects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Periodo académico
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            disabled={q.loading}
          >
            <option value="">Todos los periodos</option>
            {!r && term && <option value={term}>Periodo seleccionado</option>}
            {r?.filters.academic_terms.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Buscar examen
          <input
            type="search"
            maxLength={255}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre del examen"
          />
        </label>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={q.loading}
        >
          Buscar
        </button>
      </form>
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
