import { useEffect, useRef, useState } from 'react'
import { getExamReport } from '../api/examReportsApi'
import type {
  ReportExam,
  ReportFilters,
  ExamReportPage,
  ReportMetadata,
} from '../types/report.types'
export function useExamReport(exam: ReportExam) {
  const active = useRef(true),
    request = useRef<AbortController | null>(null),
    current = useRef<{
      filters: ReportFilters
      report?: ReportMetadata
      page: number
    } | null>(null)
  const [state, setState] = useState<{
    data: ExamReportPage | null
    busy: boolean
    error: string | null
  }>({ data: null, busy: false, error: null })
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      request.current?.abort()
    }
  }, [])
  async function load(
    filters: ReportFilters,
    page = 1,
    previous?: ReportMetadata,
  ) {
    if (request.current) return
    const c = new AbortController()
    request.current = c
    current.current = { filters, report: previous, page }
    setState({ data: null, busy: true, error: null })
    try {
      const data = await getExamReport(exam, filters, page, previous, c.signal)
      if (active.current && !c.signal.aborted) {
        current.current = { filters, report: data.report, page }
        setState({ data, busy: false, error: null })
      }
    } catch (e) {
      if (active.current && !c.signal.aborted)
        setState({
          data: null,
          busy: false,
          error:
            e instanceof Error ? e.message : 'No se pudo generar el reporte.',
        })
    } finally {
      if (request.current === c) request.current = null
    }
  }
  function invalidate() {
    request.current?.abort()
    request.current = null
    current.current = null
    setState({ data: null, busy: false, error: null })
  }
  return {
    ...state,
    generate: (filters: ReportFilters) => load(filters),
    changePage: (page: number) => {
      const c = current.current
      if (c?.report) return load(c.filters, page, c.report)
    },
    retry: () => {
      const c = current.current
      if (c) return load(c.filters, c.page, c.report)
    },
    invalidate,
  }
}
