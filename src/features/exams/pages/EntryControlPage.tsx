import { useEffect, useId, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { getEntryControlErrorMessage } from '../api/entryControlApi'
import { getRooms } from '../api/teacherExamsApi'
import { EntryControlStudentModal } from '../components/EntryControlStudentModal'
import { EntryControlStudentsList } from '../components/EntryControlStudentsList'
import { EntryControlledRoomSelector } from '../components/EntryControlledRoomSelector'
import { EntryHistoryModal } from '../components/EntryHistoryModal'
import { EntryQrPanel } from '../components/EntryQrPanel'
import { EntryRecentScans } from '../components/EntryRecentScans'
import { ExamCard } from '../components/ExamCard'
import { useEntryControlStudents } from '../hooks/useEntryControlStudents'
import { useEntryRecentRecords } from '../hooks/useEntryRecentRecords'
import type {
  EntryMethod,
  EntryProcessingResponse,
  EntryStudentIdentity,
} from '../types/entryRegistration.types'
import type { Room } from '../types/exam.types'
import pageStyles from './TeacherExamsPage.module.css'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from './EntryControlPage.module.css'
import qrStyles from '../components/EntryQr.module.css'

function EntryControlContent({
  examId,
  fromTeacher,
}: {
  examId: number
  fromTeacher: boolean
}) {
  const list = useEntryControlStudents(examId)
  const recent = useEntryRecentRecords()
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsError, setRoomsError] = useState<string | null>(null)
  const [roomsVersion, setRoomsVersion] = useState(0)
  const [studentId, setStudentId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'verification' | 'attendance'>(
    'verification',
  )
  const [qrOpen, setQrOpen] = useState(false)
  // Mount on demand, then retain the hook instance to serialize camera restarts.
  const [qrActivated, setQrActivated] = useState(false)
  const [qrProcessing, setQrProcessing] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const tabsId = useId()
  const scannerId = useId()
  const exam = list.response?.exam
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

  function selectTab(tab: 'verification' | 'attendance') {
    if (tab === activeTab) return
    setStudentId(null)
    setHistoryOpen(false)
    setQrOpen(false)
    setActiveTab(tab)
  }

  function handleResult(
    response: EntryProcessingResponse,
    method: EntryMethod,
    student?: EntryStudentIdentity,
  ) {
    recent.addResult(response, method, student)
    if (
      response.result === 'AUTHORIZED' ||
      response.result === 'ALREADY_REGISTERED' ||
      method === 'MANUAL'
    )
      list.reload()
  }

  const roomSelector = (
    <EntryControlledRoomSelector
      roomId={list.roomId}
      rooms={roomOptions}
      loading={roomsLoading}
      error={roomsError}
      disabled={qrProcessing}
      onChange={changeRoom}
      onReload={() => setRoomsVersion((current) => current + 1)}
    />
  )

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
          <p>Verificación de estudiantes y registro de asistencia al examen.</p>
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
                  ? 'attendance'
                  : activeTab === 'verification'
                    ? 'attendance'
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
            id={`${tabsId}-attendance-tab`}
            aria-selected={activeTab === 'attendance'}
            aria-controls={`${tabsId}-attendance-panel`}
            className={styles.tab}
            tabIndex={activeTab === 'attendance' ? 0 : -1}
            onClick={() => selectTab('attendance')}
          >
            Registro de asistencia
          </button>
        </div>
        <div
          role="tabpanel"
          id={`${tabsId}-verification-panel`}
          aria-labelledby={`${tabsId}-verification-tab`}
          hidden={activeTab !== 'verification'}
        >
          {activeTab === 'verification' ? (
            <EntryControlStudentsList
              list={list}
              onView={setStudentId}
              roomSelector={roomSelector}
            />
          ) : null}
        </div>
        <div
          role="tabpanel"
          id={`${tabsId}-attendance-panel`}
          aria-labelledby={`${tabsId}-attendance-tab`}
          hidden={activeTab !== 'attendance'}
        >
          <section
            className={styles.attendancePanel}
            aria-label="Registro de asistencia"
          >
            <h2>Registro de asistencia</h2>
            <div className={qrStyles.toolbar}>
              {roomSelector}
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={qrProcessing}
                onClick={() => setHistoryOpen(true)}
              >
                Ver historial completo
              </button>
            </div>
            {list.roomId == null ? (
              <p className={sharedStyles.note} role="status">
                Selecciona el ambiente controlado antes de registrar un ingreso.
              </p>
            ) : null}
            <EntryControlStudentsList
              list={list}
              manual
              disabled={qrProcessing}
              onView={setStudentId}
            />
            <div className={styles.qrLauncher}>
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                aria-expanded={qrOpen}
                aria-controls={scannerId}
                disabled={!qrOpen && list.roomId == null}
                onClick={() => {
                  if (!qrOpen) setQrActivated(true)
                  setQrOpen((current) => !current)
                }}
              >
                {qrOpen ? 'Cerrar escáner QR' : 'Escanear QR'}
              </button>
            </div>
            <div id={scannerId} hidden={!qrOpen}>
              {qrActivated ? (
                <EntryQrPanel
                  examId={examId}
                  active={
                    activeTab === 'attendance' &&
                    qrOpen &&
                    !historyOpen &&
                    studentId === null
                  }
                  roomId={list.roomId}
                  onProcessed={(response) => handleResult(response, 'QR')}
                  onProcessingChange={setQrProcessing}
                />
              ) : null}
            </div>
            <EntryRecentScans scans={recent.records} />
          </section>
        </div>
        {studentId !== null ? (
          <EntryControlStudentModal
            key={`${examId}-${studentId}-${list.roomId}-${activeTab}`}
            examId={examId}
            studentId={studentId}
            roomId={list.roomId}
            rooms={roomOptions}
            allowManualEntry={activeTab === 'attendance'}
            onManualResult={(response, student) =>
              handleResult(response, 'MANUAL', student)
            }
            onClose={() => setStudentId(null)}
          />
        ) : null}
        {historyOpen && activeTab === 'attendance' ? (
          <EntryHistoryModal
            examId={examId}
            onClose={() => setHistoryOpen(false)}
          />
        ) : null}
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
