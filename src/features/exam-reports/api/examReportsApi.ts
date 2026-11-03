import { httpClient } from '@/shared/api/httpClient'
import { positiveId } from '@/features/infractions/utils/infractionValidation'
import { readInfractionMeta } from '@/features/infractions/api/infractionResponse'
import {
  validateReportFilters,
  isReportFormat,
  safeReportId,
} from '../utils/reportValidation'
import { ExamReportError, mapReportError, invalidReport } from './reportErrors'
import { readOption, readReportExam, readExamReport } from './reportResponse'
import type {
  ReportCatalogQuery,
  ReportCatalog,
  ReportExam,
  ReportFilters,
  ReportMetadata,
  ExamReportPage,
  ReportFormat,
} from '../types/report.types'
export async function getReportCatalog(
  q: ReportCatalogQuery,
  signal?: AbortSignal,
): Promise<ReportCatalog> {
  if (
    !positiveId(q.page) ||
    typeof q.search !== 'string' ||
    q.search.trim().length > 255 ||
    [q.exam_id, q.subject_id, q.academic_term_id].some(
      (id) => id !== undefined && !positiveId(id),
    )
  )
    throw new ExamReportError('Los filtros del catálogo no son válidos.', 422)
  try {
    const { data: v } = await httpClient.get<ReportCatalog>(
      '/exam-reports/catalog',
      { params: { ...q, search: q.search.trim(), per_page: 10 }, signal },
    )
    if (
      !v ||
      !Array.isArray(v.data) ||
      new Set(v.data.map((e) => e?.id)).size !== v.data.length ||
      !Array.isArray(v.filters?.subjects) ||
      !Array.isArray(v.filters.academic_terms)
    )
      invalidReport()
    readInfractionMeta(v.meta, q.page, v.data.length)
    if (v.meta.per_page !== 10) invalidReport()
    for (const options of [v.filters.subjects, v.filters.academic_terms]) {
      if (new Set(options.map((o) => o?.id)).size !== options.length)
        invalidReport()
      options.forEach(readOption)
    }
    v.data.forEach((e) => {
      readReportExam(e)
      if (
        (q.exam_id && e.id !== q.exam_id) ||
        (q.subject_id && e.subject.id !== q.subject_id) ||
        (q.academic_term_id && e.academic_term.id !== q.academic_term_id)
      )
        invalidReport()
    })
    return v
  } catch (e) {
    return mapReportError(e)
  }
}
export async function getExamReport(
  exam: ReportExam,
  filters: ReportFilters,
  page = 1,
  previous?: ReportMetadata,
  signal?: AbortSignal,
): Promise<ExamReportPage> {
  readReportExam(exam)
  if (
    Object.keys(validateReportFilters(filters)).length ||
    !positiveId(page) ||
    !exam.permissions.report_types.includes(filters.type) ||
    (!previous && page !== 1) ||
    (previous &&
      (previous.type !== filters.type ||
        !safeReportId(previous.id) ||
        previous.filters.exam_id !== exam.id ||
        previous.filters.subject_id !== exam.subject.id ||
        previous.filters.academic_term_id !== exam.academic_term.id))
  )
    throw new ExamReportError(
      'Selecciona un reporte autorizado y revisa sus filtros.',
      422,
    )
  try {
    const { data } = await httpClient.get<ExamReportPage>(
      `/exams/${exam.id}/reports/${filters.type}`,
      {
        params: {
          subject_id: exam.subject.id,
          academic_term_id: exam.academic_term.id,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          page,
          per_page: 10,
          report_id: previous?.id,
        },
        signal,
      },
    )
    return readExamReport(data, exam, filters, page, previous)
  } catch (e) {
    return mapReportError(e)
  }
}
export async function exportExamReport(
  exam: ReportExam,
  filters: ReportFilters,
  original: ExamReportPage,
  format: ReportFormat,
  signal?: AbortSignal,
): Promise<Blob> {
  readExamReport(original, exam, filters, original.meta.current_page)
  if (!isReportFormat(format) || !original.report.formats.includes(format))
    throw new ExamReportError('El formato solicitado no está autorizado.', 403)
  try {
    const r = await httpClient.get<Blob>(
      `/exams/${exam.id}/reports/${filters.type}/export`,
      {
        params: { report_id: original.report.id, format },
        responseType: 'blob',
        signal,
      },
    )
    const blob = r.data,
      expected = format === 'pdf' ? 'application/pdf' : 'text/csv'
    if (
      !(blob instanceof Blob) ||
      blob.size === 0 ||
      blob.type.split(';')[0].toLowerCase() !== expected ||
      (format === 'pdf' && (await blob.slice(0, 5).text()) !== '%PDF-') ||
      r.headers['x-report-id'] !== original.report.id ||
      r.headers['x-report-generated-at'] !== original.report.generated_at
    )
      throw new ExamReportError(
        'La descarga no corresponde al reporte generado. No se descargó ningún archivo.',
      )
    return blob
  } catch (e) {
    return mapReportError(e)
  }
}
