import { useId, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { EntryControlStudentModal } from '../components/EntryControlStudentModal'
import { EntryControlStudentsList } from '../components/EntryControlStudentsList'
import { EntryControlledRoom } from '../components/EntryControlledRoom'
import { EntryHistoryModal } from '../components/EntryHistoryModal'
import { EntryQrPanel } from '../components/EntryQrPanel'
import { EntryRecentScans } from '../components/EntryRecentScans'
import { EntryStudentsSummary } from '../components/EntryStudentsSummary'
import { ExamCard } from '../components/ExamCard'
import { useEntryControlStudents } from '../hooks/useEntryControlStudents'
import { useEntryRecentRecords } from '../hooks/useEntryRecentRecords'
import type {
  EntryMethod,
  EntryProcessingResponse,
  EntryStudentIdentity,
} from '../types/entryRegistration.types'
import { entryUnavailableReasonMessage } from '../utils/entryAvailabilityDisplay'
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
  const [studentId, setStudentId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'verification' | 'attendance'>(
    'verification',
  )
  const [attendanceMethod, setAttendanceMethod] = useState<'manual' | 'qr'>(
    'manual',
  )
  // Retain the camera hook after first use so pending starts remain serialized.
  const [qrActivated, setQrActivated] = useState(false)
  const [qrProcessing, setQrProcessing] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const tabsId = useId()
  const methodTabsId = useId()
  const exam = list.response?.exam
  const backPath = fromTeacher ? '/teacher/exams' : '/collaborator'
  const backLabel = fromTeacher ? 'Mis exámenes' : 'Colaborador'
  const canMountQr =
    activeTab === 'attendance' &&
    attendanceMethod === 'qr' &&
    exam?.entry_available === true
  // Latch the first authorized mount; later API updates only pause the same reader.
  if (canMountQr && !qrActivated) setQrActivated(true)

  function selectTab(tab: 'verification' | 'attendance') {
    if (tab === activeTab) return
    setStudentId(null)
    setHistoryOpen(false)
    setAttendanceMethod('manual')
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

  const controlledRoom = <EntryControlledRoom room={exam?.room} />

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
              controlledRoom={controlledRoom}
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
              {controlledRoom}
              <button
                type="button"
                className={sharedStyles.secondaryButton}
                disabled={qrProcessing}
                onClick={() => setHistoryOpen(true)}
              >
                Historial de ingresos
              </button>
            </div>
            {list.roomId == null ? (
              <p className={sharedStyles.note} role="status">
                El examen debe tener un ambiente asignado para registrar un
                ingreso.
              </p>
            ) : null}
            {list.response?.summary ? (
              <EntryStudentsSummary summary={list.response.summary} compact />
            ) : null}
            {exam?.entry_available === false ? (
              <div
                className={`${styles.availabilityNotice} ${styles.pending}`}
                role="status"
              >
                <h3>Registro de ingresos no disponible</h3>
                <p>
                  {entryUnavailableReasonMessage(exam.entry_unavailable_reason)}
                </p>
              </div>
            ) : null}
            <div
              className={styles.methodTabs}
              role="tablist"
              aria-label="Método de registro de asistencia"
              onKeyDown={(event) => {
                if (
                  qrProcessing ||
                  !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                    event.key,
                  )
                )
                  return
                event.preventDefault()
                const next =
                  event.key === 'Home'
                    ? 'manual'
                    : event.key === 'End'
                      ? 'qr'
                      : attendanceMethod === 'manual'
                        ? 'qr'
                        : 'manual'
                if (next === 'qr' && list.roomId == null) return
                setAttendanceMethod(next)
                document.getElementById(`${methodTabsId}-${next}-tab`)?.focus()
              }}
            >
              {(['manual', 'qr'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  role="tab"
                  id={`${methodTabsId}-${method}-tab`}
                  aria-selected={attendanceMethod === method}
                  aria-controls={`${methodTabsId}-${method}-panel`}
                  tabIndex={attendanceMethod === method ? 0 : -1}
                  disabled={
                    qrProcessing || (method === 'qr' && list.roomId == null)
                  }
                  onClick={() => setAttendanceMethod(method)}
                >
                  {method === 'manual' ? 'Registro manual' : 'Escanear QR'}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id={`${methodTabsId}-manual-panel`}
              aria-labelledby={`${methodTabsId}-manual-tab`}
              hidden={attendanceMethod !== 'manual'}
            >
              {activeTab === 'attendance' && attendanceMethod === 'manual' ? (
                <EntryControlStudentsList
                  list={list}
                  manual
                  showSummary={false}
                  onView={setStudentId}
                />
              ) : null}
            </div>
            <div
              role="tabpanel"
              id={`${methodTabsId}-qr-panel`}
              aria-labelledby={`${methodTabsId}-qr-tab`}
              hidden={attendanceMethod !== 'qr'}
            >
              <div hidden={exam?.entry_available !== true}>
                {qrActivated || canMountQr ? (
                  <EntryQrPanel
                    examId={examId}
                    active={
                      activeTab === 'attendance' &&
                      attendanceMethod === 'qr' &&
                      exam?.entry_available === true &&
                      !historyOpen &&
                      studentId === null
                    }
                    roomId={list.roomId}
                    onProcessed={(response) => handleResult(response, 'QR')}
                    onProcessingChange={setQrProcessing}
                  />
                ) : null}
              </div>
              {activeTab === 'attendance' &&
              attendanceMethod === 'qr' &&
              exam?.entry_available === false ? (
                <div className={styles.message} role="status">
                  <h3>Escaneo no disponible</h3>
                  <p>
                    {entryUnavailableReasonMessage(
                      exam.entry_unavailable_reason,
                    )}
                  </p>
                </div>
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
            examContext={exam}
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
