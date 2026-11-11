import { useId, useState } from 'react'
import { PageContainer } from '@/shared/components/ui/PageContainer/PageContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader/PageHeader'
import { Link, useParams, useSearchParams } from 'react-router'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { EntryControlStudentModal } from '../components/EntryControlStudentModal'
import { EntryControlStudentsList } from '../components/EntryControlStudentsList'
import { EntryControlExamHeader } from '../components/EntryControlExamHeader'
import { EntryQrPanel } from '../components/EntryQrPanel'
import { EntryHistoryModal } from '../components/EntryHistoryModal'
import { EntryStudentsSummary } from '../components/EntryStudentsSummary'
import { useEntryControlStudents } from '../hooks/useEntryControlStudents'
import type { EntryControlFilter } from '../types/entryControl.types'
import type {
  EntryMethod,
  EntryProcessingResponse,
  EntryStudentIdentity,
} from '../types/entryRegistration.types'
import { EntryQrStudentIdentity } from '../components/EntryQrStudentIdentity'
import { entryStudentName } from '../utils/entryControlDisplay'
import { entryUnavailableReasonMessage } from '../utils/entryAvailabilityDisplay'
import pageStyles from './TeacherExamsPage.module.css'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from './EntryControlPage.module.css'
import incidentStyles from '@/features/incidents/pages/Incidents.module.css'
import { IncidentControlDialog } from '@/features/incidents/components/IncidentControlDialog'
import type { IncidentControlMode } from '@/features/incidents/components/IncidentControlDialog'
import { incidentStudent } from '@/features/incidents/utils/incidentEntryContext'

function EntryControlContent({
  examId,
  fromTeacher,
}: {
  examId: number
  fromTeacher: boolean
}) {
  const [activeTab, setActiveTab] = useState<'verification' | 'attendance'>(
    'verification',
  )
  const list = useEntryControlStudents(examId, activeTab === 'attendance')
  const [studentId, setStudentId] = useState<number | null>(null)
  const [manualSuccessName, setManualSuccessName] = useState<string | null>(
    null,
  )
  const [manualSuccessStudent, setManualSuccessStudent] =
    useState<EntryStudentIdentity | null>(null)
  const [attendanceMethod, setAttendanceMethod] = useState<'manual' | 'qr'>(
    'manual',
  )
  // Retain the camera hook after first use so pending starts remain serialized.
  const [qrActivated, setQrActivated] = useState(false)
  const [qrProcessing, setQrProcessing] = useState(false)
  const [incidentMode, setIncidentMode] = useState<IncidentControlMode | null>(
    null,
  )
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
    list.setPage(1)
    setStudentId(null)
    setAttendanceMethod('manual')
    setActiveTab(tab)
  }

  function selectAttendanceMethod(method: 'manual' | 'qr') {
    setAttendanceMethod(method)
  }

  function selectFilter(filter: EntryControlFilter) {
    list.setFilter(filter)
  }

  function handleResult(
    response: EntryProcessingResponse,
    method: EntryMethod,
    studentName?: string,
  ) {
    const manualSuccess =
      method === 'MANUAL' && response.result === 'AUTHORIZED'
    if (
      response.result === 'AUTHORIZED' ||
      response.result === 'ALREADY_REGISTERED' ||
      method === 'MANUAL'
    )
      list.reload()
    if (manualSuccess) {
      setStudentId(null)
      const responseStudent = response.data?.student
      setManualSuccessStudent(responseStudent ?? null)
      setManualSuccessName(
        studentName ??
          (responseStudent ? entryStudentName(responseStudent) : null),
      )
    }
  }

  return (
    <main className={styles.page}>
      <PageContainer className={styles.container}>
        <PageHeader
          title="Control de ingreso"
          breadcrumbs={[
            { label: backLabel, to: backPath },
            { label: 'Control de ingreso' },
          ]}
          actions={
            <Link
              className={sharedStyles.secondaryButton}
              to={`/exams/${examId}/offline`}
            >
              Control sin conexión
            </Link>
          }
          description={
            !fromTeacher ? (
              <>
                Colaborador temporal · Apoyo en examen · Autorización temporal
                para este examen.
              </>
            ) : undefined
          }
        />
        <section className={`${pageStyles.content} ${styles.content}`}>
          {exam ? <EntryControlExamHeader exam={exam} /> : null}
          {exam ? (
            <div className={incidentStyles.access}>
              {list.response?.permissions?.can_annul_entries === true ? (
                <button
                  type="button"
                  disabled={qrProcessing}
                  onClick={() => setHistoryOpen(true)}
                >
                  Gestionar ingresos
                </button>
              ) : null}

              <button
                type="button"
                disabled={qrProcessing}
                onClick={() => setIncidentMode({ context: { student: null } })}
              >
                Registrar incidencia o infracción
              </button>

              <Link
                to={`/exams/${examId}/incidents${fromTeacher ? '?from=teacher' : ''}`}
              >
                Incidencias e infracciones
              </Link>
            </div>
          ) : null}
          {list.response?.summary ? (
            <EntryStudentsSummary
              summary={list.response.summary}
              incidents={
                !list.query.trim() ? list.filterCounts?.incidents : undefined
              }
            />
          ) : null}
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Herramientas de control de ingreso"
            onKeyDown={(event) => {
              if (
                !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
              )
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
                onFilterChange={selectFilter}
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
              {list.roomId == null ? (
                <p className={sharedStyles.note} role="status">
                  El examen debe tener un ambiente asignado para registrar un
                  ingreso.
                </p>
              ) : null}
              {exam?.entry_available === false ? (
                <div
                  className={`${styles.availabilityNotice} ${styles.pending}`}
                  role="status"
                >
                  <h3>Registro de ingresos no disponible</h3>
                  <p>
                    {entryUnavailableReasonMessage(
                      exam.entry_unavailable_reason,
                    )}
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
                  selectAttendanceMethod(next)
                  document
                    .getElementById(`${methodTabsId}-${next}-tab`)
                    ?.focus()
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
                    onClick={() => selectAttendanceMethod(method)}
                  >
                    {method === 'manual' ? 'Manual' : 'Escanear QR'}
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
                        studentId === null &&
                        incidentMode === null &&
                        !historyOpen
                      }
                      roomId={list.roomId}
                      onProcessed={(response) => handleResult(response, 'QR')}
                      onProcessingChange={setQrProcessing}
                      onReportIncident={(context) =>
                        setIncidentMode({ context })
                      }
                      onViewIncident={(incidentId) =>
                        setIncidentMode({ incidentId })
                      }
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
            </section>
          </div>
          {studentId !== null && incidentMode === null ? (
            <EntryControlStudentModal
              key={`${examId}-${studentId}-${list.roomId}-${activeTab}`}
              examId={examId}
              studentId={studentId}
              roomId={list.roomId}
              examContext={exam}
              allowManualEntry={activeTab === 'attendance'}
              onManualResult={(response, student) =>
                handleResult(response, 'MANUAL', entryStudentName(student))
              }
              onClose={() => setStudentId(null)}
              onReportIncident={(student) =>
                setIncidentMode({
                  context: { student: incidentStudent(student) },
                })
              }
            />
          ) : null}
          {manualSuccessName && incidentMode === null ? (
            <CollaborationModal
              title="Ingreso registrado"
              onClose={() => setManualSuccessName(null)}
            >
              <p>{manualSuccessName} fue registrada para el examen.</p>
              {manualSuccessStudent ? (
                <EntryQrStudentIdentity student={manualSuccessStudent} />
              ) : null}
              <div className={sharedStyles.actions}>
                <button
                  type="button"
                  className={sharedStyles.secondaryButton}
                  onClick={() =>
                    setIncidentMode({
                      context: {
                        student: incidentStudent(manualSuccessStudent),
                      },
                    })
                  }
                >
                  Reportar una situación
                </button>
                <button
                  type="button"
                  className={sharedStyles.secondaryButton}
                  onClick={() => setManualSuccessName(null)}
                >
                  Cerrar
                </button>
              </div>
            </CollaborationModal>
          ) : null}

          {incidentMode ? (
            <IncidentControlDialog
              examId={examId}
              mode={incidentMode}
              onClose={() => {
                setIncidentMode(null)
                list.reload()
              }}
            />
          ) : null}

          {historyOpen ? (
            <EntryHistoryModal
              examId={examId}
              onClose={() => setHistoryOpen(false)}
              onEntriesChanged={list.reload}
            />
          ) : null}
        </section>
      </PageContainer>
    </main>
  )
}

export function EntryControlPage() {
  const { examId } = useParams()
  const [searchParams] = useSearchParams()
  const id = Number(examId)
  if (!Number.isSafeInteger(id) || id <= 0) {
    return (
      <main className={styles.page}>
        <PageContainer className={styles.container}>
          <PageHeader title="Control de ingreso" />
          <section className={pageStyles.state} role="alert">
            <p>El identificador del examen no es válido.</p>
            <Link to="/">Volver al inicio</Link>
          </section>
        </PageContainer>
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
