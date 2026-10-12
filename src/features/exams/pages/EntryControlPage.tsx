import { useEffect, useId, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { getEntryControlErrorMessage } from '../api/entryControlApi'
import { getRooms } from '../api/teacherExamsApi'
import { EntryControlStudentModal } from '../components/EntryControlStudentModal'
import { EntryControlTable } from '../components/EntryControlTable'
import { EntryControlledRoomSelector } from '../components/EntryControlledRoomSelector'
import { EntryQrPanel } from '../components/EntryQrPanel'
import { ExamCard } from '../components/ExamCard'
import { useEntryControlStudents } from '../hooks/useEntryControlStudents'
import type { Room } from '../types/exam.types'
import pageStyles from './TeacherExamsPage.module.css'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from './EntryControlPage.module.css'

function EntryControlContent({
  examId,
  fromTeacher,
}: {
  examId: number
  fromTeacher: boolean
}) {
  const list = useEntryControlStudents(examId)
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsError, setRoomsError] = useState<string | null>(null)
  const [roomsVersion, setRoomsVersion] = useState(0)
  const [studentId, setStudentId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'verification' | 'qr'>(
    'verification',
  )
  const searchId = useId()
  const tabsId = useId()
  const exam = list.response?.exam
  const summary = list.response?.summary
  const meta = list.meta
  const roomOptions =
    exam?.room && !rooms.some((room) => room.id === exam.room?.id)
      ? [exam.room, ...rooms]
      : rooms
  const backPath = fromTeacher ? '/teacher/exams' : '/collaborator'
  const backLabel = fromTeacher ? 'Mis exámenes' : 'Colaborador'

  function changeRoom(roomId: number) {
    setStudentId(null)
    list.setRoomId(roomId)
  }

  function selectTab(tab: 'verification' | 'qr') {
    setStudentId(null)
    setActiveTab(tab)
  }

  useEffect(() => {
    let active = true
    setRoomsLoading(true)
    setRoomsError(null)
    void getRooms()
      .then((result) => {
        if (active) setRooms(result)
      })
      .catch((cause: unknown) => {
        if (active)
          setRoomsError(
            getEntryControlErrorMessage(
              cause,
              'No se pudo consultar el catálogo de ambientes.',
            ),
          )
      })
      .finally(() => {
        if (active) setRoomsLoading(false)
      })
    return () => {
      active = false
    }
  }, [roomsVersion])

  return (
    <main className={`${pageStyles.page} ${styles.page}`}>
      <section className={`${pageStyles.content} ${styles.content}`}>
        <nav
          className={sharedStyles.breadcrumb}
          aria-label="Ruta de navegación"
        >
          <Link to={backPath}>{backLabel}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Control de ingreso</span>
        </nav>
        <header className={pageStyles.pageHeader}>
          <h1>Control de ingreso</h1>
          <p>Identificación y verificación de estudiantes para ingreso.</p>
          {!fromTeacher ? (
            <p>
              Colaborador temporal · Apoyo en examen · Autorización temporal
              para este examen.
            </p>
          ) : null}
        </header>
        {exam ? (
          <ExamCard
            subjectName={exam.subject_name}
            examName={exam.name}
            examDate={exam.exam_date}
            examTime={exam.start_time}
            durationMinutes={exam.duration_minutes}
            roomName={exam.room?.name}
            roomCode={exam.room?.code}
            evaluationType={exam.evaluation_type}
            status={exam.status}
          />
        ) : null}
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Herramientas de control de ingreso"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
              return
            event.preventDefault()
            const next =
              event.key === 'Home'
                ? 'verification'
                : event.key === 'End'
                  ? 'qr'
                  : activeTab === 'verification'
                    ? 'qr'
                    : 'verification'
            selectTab(next)
            document.getElementById(`${tabsId}-${next}-tab`)?.focus()
          }}
        >
          <button
            type="button"
            role="tab"
            id={`${tabsId}-verification-tab`}
            aria-selected={activeTab === 'verification'}
            aria-controls={`${tabsId}-verification-panel`}
            className={styles.tab}
            tabIndex={activeTab === 'verification' ? 0 : -1}
            onClick={() => selectTab('verification')}
          >
            Verificación
          </button>
          <button
            type="button"
            role="tab"
            id={`${tabsId}-qr-tab`}
            aria-selected={activeTab === 'qr'}
            aria-controls={`${tabsId}-qr-panel`}
            className={styles.tab}
            tabIndex={activeTab === 'qr' ? 0 : -1}
            onClick={() => selectTab('qr')}
          >
            Escanear QR
          </button>
        </div>
        <div
          role="tabpanel"
          id={`${tabsId}-verification-panel`}
          aria-labelledby={`${tabsId}-verification-tab`}
          hidden={activeTab !== 'verification'}
        >
          {summary ? (
            <dl
              className={styles.summary}
              aria-label="Resumen de estudiantes del examen"
            >
              <div>
                <dt>Total estudiantes</dt>
                <dd>{summary.total_students}</dd>
              </div>
              <div>
                <dt>Registrados</dt>
                <dd>{summary.registered}</dd>
              </div>
              <div>
                <dt>Pendientes</dt>
                <dd>{summary.pending}</dd>
              </div>
            </dl>
          ) : null}
          <section
            className={sharedStyles.section}
            aria-labelledby="entry-students-title"
          >
            <h2 id="entry-students-title">Estudiantes</h2>
            <div className={styles.filters}>
              <div className={styles.field}>
                <label htmlFor={searchId}>Buscar estudiante</label>
                <input
                  id={searchId}
                  type="search"
                  value={list.query}
                  placeholder="Nombre, apellido, nombre completo, SIS o CI"
                  onChange={(event) => list.setQuery(event.target.value)}
                />
              </div>
              <EntryControlledRoomSelector
                roomId={list.roomId}
                rooms={roomOptions}
                loading={roomsLoading}
                error={roomsError}
                onChange={changeRoom}
                onReload={() => setRoomsVersion((current) => current + 1)}
              />
            </div>
            {list.error ? (
              <section className={pageStyles.state} role="alert">
                <p>{list.error}</p>
                <button type="button" onClick={list.reload}>
                  Reintentar
                </button>
              </section>
            ) : null}
            <EntryControlTable
              items={list.items}
              meta={meta}
              loading={list.loading}
              error={list.error}
              onView={setStudentId}
            />
            {meta ? (
              <nav
                className={styles.pagination}
                aria-label="Paginación de estudiantes"
              >
                <p role="status">
                  {meta.total} estudiantes · Página {meta.current_page} de{' '}
                  {Math.max(1, meta.last_page)} · {meta.per_page} por página
                </p>
                <div>
                  <button
                    type="button"
                    className={sharedStyles.secondaryButton}
                    disabled={list.loading || meta.current_page <= 1}
                    onClick={() => list.setPage(meta.current_page - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className={sharedStyles.secondaryButton}
                    disabled={
                      list.loading || meta.current_page >= meta.last_page
                    }
                    onClick={() => list.setPage(meta.current_page + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </nav>
            ) : null}
          </section>
          {studentId !== null ? (
            <EntryControlStudentModal
              key={`${examId}-${studentId}-${list.roomId}`}
              examId={examId}
              studentId={studentId}
              roomId={list.roomId}
              rooms={roomOptions}
              onClose={() => setStudentId(null)}
            />
          ) : null}
        </div>
        <div
          role="tabpanel"
          id={`${tabsId}-qr-panel`}
          aria-labelledby={`${tabsId}-qr-tab`}
          hidden={activeTab !== 'qr'}
        >
          <EntryQrPanel
            examId={examId}
            active={activeTab === 'qr'}
            roomId={list.roomId}
            rooms={roomOptions}
            roomsLoading={roomsLoading}
            roomsError={roomsError}
            onRoomChange={changeRoom}
            onReloadRooms={() => setRoomsVersion((current) => current + 1)}
            onAuthorized={list.reload}
          />
        </div>
      </section>
    </main>
  )
}

export function EntryControlPage() {
  const { examId } = useParams()
  const [searchParams] = useSearchParams()
  const id = Number(examId)
  if (!Number.isSafeInteger(id) || id <= 0) {
    return (
      <main className={pageStyles.page}>
        <section className={pageStyles.state} role="alert">
          <h1>Control de ingreso</h1>
          <p>El identificador del examen no es válido.</p>
          <Link to="/">Volver al inicio</Link>
        </section>
      </main>
    )
  }
  // Origin affects navigation only. The shared GET decides authorization for every role.
  return (
    <EntryControlContent
      key={id}
      examId={id}
      fromTeacher={searchParams.get('from') === 'teacher'}
    />
  )
}
