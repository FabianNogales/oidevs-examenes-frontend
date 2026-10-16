import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ExamCard } from '@/features/exams/components/ExamCard'
import { useTeacherUpcomingExams } from '@/features/exams/hooks/useTeacherUpcomingExams'
import {
  EligibilityApiError,
  bulkUpdateExamEligibilities,
  updateExamEligibility,
} from '../api/eligibilitiesApi'
import { EligibilityTable } from '../components/EligibilityTable'
import { BulkEligibilitiesModal } from '../components/BulkEligibilitiesModal'
import { ManageEligibilityModal } from '../components/ManageEligibilityModal'
import { useExamEligibilities } from '../hooks/useExamEligibilities'
import type {
  BulkEligibilityResult,
  ExamEligibility,
  EligibilityStatus,
  UpdateEligibilityPayload,
} from '../types/eligibility.types'
import {
  getEligibilityStudentName,
  normalizeEligibilitySearch,
} from '../utils/eligibilityDisplay'
import pageStyles from '@/features/exams/pages/TeacherExamsPage.module.css'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from './Eligibilities.module.css'

const PAGE_SIZE = 10

function ExamEligibilitiesContent({ examId }: { examId: number }) {
  const {
    exams,
    isLoading: examLoading,
    errorMessage: examError,
    loadExams,
  } = useTeacherUpcomingExams()
  const exam = exams.find((item) => item.id === examId)
  const list = useExamEligibilities(examId)
  const { notify } = useAuth()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'ALL' | EligibilityStatus>(
    'ALL',
  )
  const [selected, setSelected] = useState<ExamEligibility | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const searchId = useId()
  const filterId = useId()
  const search = normalizeEligibilitySearch(query)
  const counts = list.items.reduce(
    (result, item) => {
      if (item.status === 'ELIGIBLE') result.eligible += 1
      if (item.status === 'INELIGIBLE') result.ineligible += 1
      return result
    },
    { eligible: 0, ineligible: 0 },
  )
  const filtered = list.items.filter(
    (item) =>
      (statusFilter === 'ALL' || item.status === statusFilter) &&
      normalizeEligibilitySearch(
        `${getEligibilityStudentName(item)} ${item.sis_code}`,
      ).includes(search),
  )
  const showCounts = !list.loading && !list.error
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE)

  async function save(
    studentId: number,
    payload: UpdateEligibilityPayload,
    signal: AbortSignal,
  ) {
    try {
      await updateExamEligibility(examId, studentId, payload, signal)
    } catch (cause) {
      if (
        !signal.aborted &&
        !(cause instanceof EligibilityApiError && cause.status === 422)
      ) {
        notify(
          'error',
          cause instanceof Error
            ? cause.message
            : 'No se pudo guardar la habilitación.',
        )
      }
      throw cause
    }
    if (signal.aborted) return
    setSelected(null)
    notify('success', 'La habilitación del estudiante fue actualizada.')
    void list.reload()
  }

  async function processFile(
    file: File,
    signal: AbortSignal,
  ): Promise<BulkEligibilityResult> {
    let result: BulkEligibilityResult
    try {
      result = await bulkUpdateExamEligibilities(examId, file, signal)
    } catch (cause) {
      if (!signal.aborted) {
        notify(
          'error',
          cause instanceof Error ? cause.message : 'No se pudo procesar el archivo.',
        )
      }
      throw cause
    }
    if (!signal.aborted) {
      if (result.updated_rows > 0) void list.reload()
      notify(
        result.updated_rows > 0 ? 'success' : 'info',
        `Carga procesada: ${result.updated_rows} actualizados y ${result.failed_rows} con errores.`,
      )
    }
    return result
  }

  return (
    <main className={pageStyles.page}>
      <section className={pageStyles.content}>
        <nav
          className={sharedStyles.breadcrumb}
          aria-label="Ruta de navegación"
        >
          <Link to="/teacher/exams">Mis exámenes</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Habilitaciones</span>
        </nav>
        <header className={pageStyles.pageHeader}>
          <h1>Habilitaciones del examen</h1>
          <p>
            Consulta y gestiona el estado de habilitación de los estudiantes
            para este examen.
          </p>
        </header>
        {examLoading ? (
          <p role="status">Cargando información del examen…</p>
        ) : examError ? (
          <div role="alert">
            <p className={sharedStyles.error}>{examError}</p>
            <button
              type="button"
              className={sharedStyles.secondaryButton}
              onClick={() => void loadExams()}
            >
              Reintentar información del examen
            </button>
          </div>
        ) : exam ? (
          <ExamCard
            subjectName={exam.subject_name}
            subjectCode={exam.subject_code}
            examName={exam.name}
            examDate={exam.exam_date}
            examTime={exam.start_time}
            durationMinutes={exam.duration_minutes}
            roomName={exam.room?.name}
            roomCode={exam.room?.code}
            evaluationType={exam.evaluation_type}
          />
        ) : (
          <p className={sharedStyles.note}>
            La información general del examen no está disponible entre tus
            exámenes programados.
          </p>
        )}
        <section
          className={sharedStyles.section}
          aria-labelledby="exam-eligibilities-title"
        >
          <div className={sharedStyles.sectionHeader}>
            <h2 id="exam-eligibilities-title">Estudiantes del examen</h2>
            <button
              type="button"
              className={sharedStyles.primaryButton}
              onClick={() => setBulkOpen(true)}
            >
              Cargar habilitaciones
            </button>
          </div>
          <div
            className={styles.counters}
            aria-label="Totales del examen"
            aria-live="polite"
            aria-busy={list.loading}
          >
            <div className={`${styles.counter} ${styles.eligible}`}>
              Habilitados: <strong>{showCounts ? counts.eligible : '—'}</strong>
            </div>
            <div className={`${styles.counter} ${styles.ineligible}`}>
              Inhabilitados:{' '}
              <strong>{showCounts ? counts.ineligible : '—'}</strong>
            </div>
          </div>
          <div className={styles.filters}>
            <div className={styles.field}>
              <label htmlFor={searchId}>Buscar estudiante</label>
              <input
                id={searchId}
                type="search"
                placeholder="Buscar por nombre, apellido o SIS..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={filterId}>Habilitación</label>
              <select
                id={filterId}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(
                    event.target.value as 'ALL' | EligibilityStatus,
                  )
                  setPage(1)
                }}
              >
                <option value="ALL">Todos</option>
                <option value="ELIGIBLE">Habilitados</option>
                <option value="INELIGIBLE">Inhabilitados</option>
              </select>
            </div>
          </div>
          {list.error ? (
            <div role="alert">
              <p className={sharedStyles.error}>{list.error}</p>
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                onClick={() => void list.reload()}
              >
                Reintentar
              </button>
            </div>
          ) : null}
          <EligibilityTable
            items={pageItems}
            startIndex={startIndex}
            loading={list.loading}
            emptyMessage={
              list.error
                ? 'No se pudieron consultar las habilitaciones.'
                : list.items.length === 0
                  ? 'No hay estudiantes asociados a este examen.'
                  : 'No se encontraron estudiantes con los filtros seleccionados.'
            }
            onManage={setSelected}
          />
          {!list.loading && !list.error && totalPages > 1 ? (
            <nav
              className={styles.pagination}
              aria-label="Paginación de habilitaciones"
            >
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Anterior
              </button>
              <span role="status" aria-live="polite" aria-atomic="true">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Siguiente
              </button>
            </nav>
          ) : null}
        </section>
        {selected ? (
          <ManageEligibilityModal
            key={selected.id}
            examId={examId}
            eligibility={selected}
            onClose={() => setSelected(null)}
            onSave={save}
          />
        ) : null}
        {bulkOpen ? (
          <BulkEligibilitiesModal
            onClose={() => setBulkOpen(false)}
            onProcess={processFile}
          />
        ) : null}
      </section>
    </main>
  )
}

export function ExamEligibilitiesPage() {
  const { examId } = useParams()
  const id = Number(examId)
  if (!Number.isSafeInteger(id) || id <= 0) {
    return (
      <main className={pageStyles.page}>
        <section className={pageStyles.content}>
          <h1>Habilitaciones del examen</h1>
          <p>El identificador del examen no es válido.</p>
          <Link to="/teacher/exams">Volver a Mis exámenes</Link>
        </section>
      </main>
    )
  }
  // Reset filters/modal and abort HU12 requests when navigating to another exam.
  return <ExamEligibilitiesContent key={id} examId={id} />
}
