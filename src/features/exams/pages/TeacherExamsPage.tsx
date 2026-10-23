import { Breadcrumbs } from '@/shared/components/Breadcrumbs/Breadcrumbs'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ExamCard } from '@/features/exams/components/ExamCard'
import { ExamTools } from '@/features/exams/components/ExamTools'
import { ExamsSkeleton } from '@/features/exams/components/ExamsSkeleton'
import { useManagedExams } from '@/features/exams/hooks/useManagedExams'
import {
  EXAM_VIEWS,
  type ExamView,
} from '@/features/exams/api/examManagementApi'
import management from './ExamManagement.module.css'

import styles from './TeacherExamsPage.module.css'

export function TeacherExamsPage() {
  const [params, setParams] = useSearchParams()
  const view = EXAM_VIEWS.includes(params.get('view') as ExamView)
    ? (params.get('view') as ExamView)
    : 'upcoming'
  const search = params.get('search') ?? ''
  const rawPage = Number(params.get('page') ?? 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const {
    result,
    loading: isLoading,
    error: errorMessage,
    reload: loadExams,
  } = useManagedExams({ view, search, page })
  const exams = result?.data ?? []
  function updateFilters(nextView: ExamView, nextSearch: string, nextPage = 1) {
    setParams({
      view: nextView,
      ...(nextSearch ? { search: nextSearch } : {}),
      page: String(nextPage),
    })
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateFilters(
      view,
      String(new FormData(event.currentTarget).get('search') ?? '').trim(),
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <Breadcrumbs
          items={[{ label: 'Inicio', to: '/' }, { label: 'Mis exámenes' }]}
        />
        <header className={styles.pageHeader}>
          <div>
            <h1>Mis exámenes</h1>
            <p>Consulta tus exámenes por materia, fecha y estado.</p>
          </div>
        </header>

        <form className={management.filters} onSubmit={submitSearch}>
          <label htmlFor="exam-view">
            Mostrar
            <select
              id="exam-view"
              value={view}
              onChange={(event) =>
                updateFilters(event.target.value as ExamView, search)
              }
            >
              <option value="upcoming">Próximos y en curso</option>
              <option value="past">Anteriores</option>
              <option value="cancelled">Cancelados</option>
              <option value="all">Todos</option>
            </select>
          </label>
          <label>
            Buscar examen o materia
            <input
              key={search}
              defaultValue={search}
              name="search"
              placeholder="Nombre del examen, materia o código"
              maxLength={255}
            />
          </label>
          <button type="submit">Buscar</button>
        </form>
        {result?.legacy ? (
          <p className={management.notice} role="status">
            El servidor aún no dispone del historial completo. Solo se muestran
            los registros de la consulta actual de próximos exámenes.
          </p>
        ) : null}
        {isLoading ? <ExamsSkeleton /> : null}

        {errorMessage ? (
          <section className={styles.state} role="alert">
            <h2>No se pudieron cargar los exámenes</h2>
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadExams()}
              disabled={isLoading}
            >
              {isLoading ? 'Reintentando…' : 'Reintentar'}
            </button>
          </section>
        ) : null}

        {!isLoading && !errorMessage && exams.length > 0 ? (
          <section aria-label="Exámenes del docente" className={styles.list}>
            {exams.map((exam) => (
              <ExamCard
                key={exam.id}
                subjectCode={exam.subject_code}
                subjectName={exam.subject_name}
                examName={exam.name}
                examDate={exam.exam_date}
                examTime={exam.start_time}
                durationMinutes={exam.duration_minutes}
                roomName={exam.room?.name}
                roomCode={exam.room?.code}
                evaluationType={exam.evaluation_type}
                status={exam.status}
                academicTermName={exam.academic_term_name}
              >
                <Link to={`/teacher/exams/${exam.id}?${params.toString()}`}>
                  Ver detalle
                </Link>
                <ExamTools examId={exam.id} />
              </ExamCard>
            ))}
          </section>
        ) : null}

        {!isLoading &&
        !errorMessage &&
        !(result?.legacy && view !== 'upcoming') &&
        exams.length === 0 ? (
          <section className={styles.state}>
            <h2>No hay exámenes para esta consulta.</h2>
            <p>Prueba con otro filtro o nombre de examen o materia.</p>
          </section>
        ) : null}
        {!isLoading && !errorMessage && result && !result.legacy ? (
          <nav
            className={management.pagination}
            aria-label="Páginas de exámenes"
          >
            <span role="status">
              {result.meta.total} exámenes · Página {result.meta.current_page}{' '}
              de {Math.max(1, result.meta.last_page)}
            </span>
            <button
              type="button"
              disabled={result.meta.current_page <= 1}
              onClick={() =>
                updateFilters(view, search, result.meta.current_page - 1)
              }
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={result.meta.current_page >= result.meta.last_page}
              onClick={() =>
                updateFilters(view, search, result.meta.current_page + 1)
              }
            >
              Siguiente
            </button>
          </nav>
        ) : null}
      </section>
    </main>
  )
}
