import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { UserIcon } from '@/features/auth/components/AuthIcons'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import {
  getEntryControlErrorMessage,
  getEntryControlStudent,
} from '../api/entryControlApi'
import type {
  EntryControlStudent,
  EntryControlStudentResponse,
} from '../types/entryControl.types'
import type { EntryManualResponse } from '../types/entryRegistration.types'
import type { Room } from '../types/exam.types'
import {
  eligibilityDisplay,
  enrollmentDisplay,
  entryDisplay,
  entryRoomLabel,
  entryStudentName,
  formatEntryDate,
  formatEntryTimestamp,
  roomDisplay,
} from '../utils/entryControlDisplay'
import { EntryConditionBadge } from './EntryConditionBadge'
import { EntryManualConfirmationModal } from './EntryManualConfirmationModal'
import { EntryResultPanel } from './EntryResultPanel'
import { canRegisterEntryManually } from '../utils/entryManualEligibility'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from '../pages/EntryControlPage.module.css'

type Props = {
  examId: number
  studentId: number
  roomId: number | undefined
  rooms: Room[]
  onClose: () => void
  allowManualEntry?: boolean
  onManualResult?: (
    response: EntryManualResponse,
    student: EntryControlStudent,
  ) => void
}

export function EntryControlStudentModal({
  examId,
  studentId,
  roomId,
  rooms,
  onClose,
  allowManualEntry = false,
  onManualResult,
}: Props) {
  const [detail, setDetail] = useState<EntryControlStudentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [manualResponse, setManualResponse] =
    useState<EntryManualResponse | null>(null)
  const modalLayer = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const dialog =
      modalLayer.current?.querySelector<HTMLDivElement>('[role="dialog"]')
    if (!dialog) return
    const overlay = dialog.parentElement
    if (overlay) {
      overlay.scrollTop = 0
      overlay.scrollLeft = 0
    }
    const smooth =
      version > 0 &&
      !confirming &&
      !loading &&
      detail !== null &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    dialog.scrollTo({ top: 0, left: 0, behavior: smooth ? 'smooth' : 'auto' })
  }, [examId, studentId, roomId, version, confirming, loading, detail])

  function renderModal(content: ReactNode) {
    return createPortal(
      <div ref={modalLayer} className={styles.detailModalLayer}>
        {content}
      </div>,
      document.body,
    )
  }

  useEffect(() => {
    const controller = new AbortController()
    setDetail(null)
    setLoading(true)
    setError(null)
    void getEntryControlStudent(examId, studentId, roomId, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setDetail(response)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            getEntryControlErrorMessage(
              cause,
              'No se pudo consultar el estudiante. Cierra el modal y vuelve a intentarlo.',
            ),
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [examId, studentId, roomId, version])

  const student = detail?.data
  const exam = detail?.exam
  const photoUrl = student?.profile_photo_url?.trim()
  const assignedRoom =
    rooms.find((room) => room.id === student?.assigned_room_id) ??
    (exam?.room?.id === student?.assigned_room_id ? exam?.room : null)
  const controlledRoom =
    rooms.find((room) => room.id === student?.controlled_room_id) ??
    (exam?.room?.id === student?.controlled_room_id ? exam?.room : null)
  const ineligible =
    student?.eligibility_status === 'INELIGIBLE' ||
    student?.blockers.some((blocker) => blocker.code === 'INELIGIBLE')
  const manualEnabled = allowManualEntry && onManualResult !== undefined
  // Presentation only: registration checks continue to use the original blockers.
  const visibleBlockers = student
    ? student.blockers.filter(
        (blocker) =>
          student.entry_status !== 'REGISTERED' ||
          blocker.code !== 'ALREADY_REGISTERED',
      )
    : []

  if (confirming && manualEnabled && student && exam && roomId != null) {
    return renderModal(
      <EntryManualConfirmationModal
        exam={exam}
        student={student}
        roomId={roomId}
        onCancel={() => {
          setConfirming(false)
          setDetail(null)
          setLoading(true)
          setVersion((current) => current + 1)
        }}
        onResult={(response) => {
          setManualResponse(response)
          setConfirming(false)
          setDetail(null)
          setLoading(true)
          setVersion((current) => current + 1)
          onManualResult?.(response, student)
        }}
      />,
    )
  }

  return renderModal(
    <div
      className={`${styles.modalScope} ${manualEnabled ? styles.manualModalScope : ''}`}
    >
      <CollaborationModal title="Información del Estudiante" onClose={onClose}>
        {manualResponse && (loading || error) ? (
          manualResponse.result === 'AUTHORIZED' ? (
            <div
              className={`${styles.manualSuccessBanner} ${styles.positive}`}
              role="status"
            >
              <p>
                <strong>
                  <span aria-hidden="true">✓</span> Ingreso registrado
                  exitosamente.
                </strong>
              </p>
              {loading ? (
                <p>Actualizando información del estudiante...</p>
              ) : null}
            </div>
          ) : (
            <EntryResultPanel
              response={manualResponse}
              processing={false}
              method="MANUAL"
            />
          )
        ) : null}
        {loading && manualResponse?.result !== 'AUTHORIZED' ? (
          <p role="status">Consultando información del estudiante…</p>
        ) : null}
        {error ? (
          <p className={sharedStyles.error} role="alert">
            {manualResponse?.result === 'AUTHORIZED'
              ? 'No se pudo actualizar la información del estudiante. '
              : null}
            {error}
          </p>
        ) : null}
        {!loading && !error && student && exam ? (
          <>
            <section
              className={styles.studentSummary}
              aria-label="Datos del estudiante"
            >
              <div className={styles.avatar}>
                {photoUrl && failedPhotoUrl !== photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={`Fotografía de ${entryStudentName(student)}`}
                    onError={() => setFailedPhotoUrl(photoUrl)}
                  />
                ) : (
                  <span role="img" aria-label="Sin fotografía de perfil">
                    <UserIcon />
                  </span>
                )}
              </div>
              <div className={styles.studentDetails}>
                <h3>{entryStudentName(student)}</h3>
                <dl className={styles.identifiers}>
                  <div>
                    <dt>SIS:</dt>
                    <dd>{student.sis_code}</dd>
                  </div>
                  <div>
                    <dt>CI:</dt>
                    <dd>{student.identity_number || 'No informado'}</dd>
                  </div>
                </dl>
                <dl
                  className={`${styles.examDetails} ${styles.studentExamDetails}`}
                >
                  <div>
                    <dt>Materia:</dt>
                    <dd>{exam.subject_name}</dd>
                  </div>
                  <div>
                    <dt>Examen:</dt>
                    <dd>{exam.name}</dd>
                  </div>
                  <div>
                    <dt>Fecha y hora:</dt>
                    <dd>
                      {formatEntryDate(exam.exam_date)} ·{' '}
                      {exam.start_time.split(':').slice(0, 2).join(':')}
                    </dd>
                  </div>
                  <div>
                    <dt>Ambiente:</dt>
                    <dd>
                      {assignedRoom
                        ? entryRoomLabel(assignedRoom)
                        : student.assigned_room_id == null
                          ? 'No asignado'
                          : `Ambiente ID ${student.assigned_room_id}`}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>
            <section
              className={styles.conditionsSection}
              aria-label="Condiciones de ingreso"
            >
              <h3>Condiciones de ingreso</h3>
              <dl className={styles.conditions}>
                {manualEnabled ? (
                  <div>
                    <dt>Estudiante</dt>
                    <dd>
                      <EntryConditionBadge
                        label={
                          student.student_status.toUpperCase() === 'ACTIVE'
                            ? 'Activo'
                            : student.student_status
                        }
                        tone={
                          student.student_status.toUpperCase() === 'ACTIVE'
                            ? 'positive'
                            : 'negative'
                        }
                      />
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Inscripción</dt>
                  <dd>
                    <EntryConditionBadge
                      {...enrollmentDisplay(student.enrollment_status)}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Habilitación</dt>
                  <dd>
                    <EntryConditionBadge
                      {...eligibilityDisplay(student.eligibility_status)}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Ambiente</dt>
                  <dd>
                    <EntryConditionBadge
                      {...roomDisplay(student.room_status)}
                    />
                  </dd>
                  <dd className={styles.conditionContext}>
                    Controlado:{' '}
                    {controlledRoom
                      ? entryRoomLabel(controlledRoom)
                      : student.controlled_room_id == null
                        ? 'No informado'
                        : `Ambiente ID ${student.controlled_room_id}`}
                  </dd>
                </div>
              </dl>
              <div className={styles.entryStatusPanel}>
                <dl className={styles.entryStatusSummary}>
                  <dt>Estado de ingreso</dt>
                  <dd>
                    <EntryConditionBadge
                      {...entryDisplay(student.entry_status)}
                    />
                  </dd>
                </dl>
                {student.entry_status === 'REGISTERED' && student.entry ? (
                  <section
                    className={styles.entryStatusDetails}
                    aria-label="Ingreso registrado"
                  >
                    <h3>Ingreso registrado</h3>
                    <dl className={styles.examDetails}>
                      <div>
                        <dt>Fecha y hora de ingreso</dt>
                        <dd>
                          {formatEntryTimestamp(student.entry.entered_at)}
                        </dd>
                      </div>
                      <div>
                        <dt>Método de verificación</dt>
                        <dd>
                          {student.entry.verification_method || 'No informado'}
                        </dd>
                      </div>
                      <div>
                        <dt>Verificado por</dt>
                        <dd>
                          {student.entry.verified_by_name || 'No informado'}
                        </dd>
                      </div>
                    </dl>
                  </section>
                ) : null}
              </div>
            </section>
            {student.meets_entry_conditions === true ? (
              <p className={`${styles.message} ${styles.positive}`}>
                El estudiante se encuentra inscrito y habilitado para este
                examen.
              </p>
            ) : null}
            {visibleBlockers.length > 0 ? (
              <section
                className={`${styles.message} ${styles.blockerMessage}`}
                aria-label="Observaciones del control de ingreso"
              >
                <h3>Observaciones del control de ingreso</h3>
                <ul className={styles.blockers}>
                  {visibleBlockers.map((blocker, index) => (
                    <li key={`${blocker.code}-${index}`}>{blocker.message}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {ineligible && (student.reason || student.observations) ? (
              <dl className={`${styles.examDetails} ${styles.message}`}>
                {student.reason ? (
                  <div>
                    <dt>Motivo de inhabilitación</dt>
                    <dd>{student.reason}</dd>
                  </div>
                ) : null}
                {student.observations ? (
                  <div>
                    <dt>Observaciones</dt>
                    <dd>{student.observations}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </>
        ) : null}
        <div className={`${sharedStyles.actions} ${styles.modalActions}`}>
          {manualEnabled &&
          !manualResponse &&
          !loading &&
          !error &&
          student &&
          canRegisterEntryManually(student, roomId) ? (
            <button
              type="button"
              className={sharedStyles.primaryButton}
              onClick={() => setConfirming(true)}
            >
              Registrar ingreso manual
            </button>
          ) : null}
          <button
            type="button"
            className={sharedStyles.secondaryButton}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </CollaborationModal>
    </div>,
  )
}
