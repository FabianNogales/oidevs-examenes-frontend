import { useEffect, useState } from 'react'
import { UserIcon } from '@/features/auth/components/AuthIcons'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import {
  getEntryControlErrorMessage,
  getEntryControlStudent,
} from '../api/entryControlApi'
import type { EntryControlStudentResponse } from '../types/entryControl.types'
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
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import styles from '../pages/EntryControlPage.module.css'

type Props = {
  examId: number
  studentId: number
  roomId: number | undefined
  rooms: Room[]
  onClose: () => void
}

export function EntryControlStudentModal({
  examId,
  studentId,
  roomId,
  rooms,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<EntryControlStudentResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null)

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
  }, [examId, studentId, roomId])

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

  return (
    <div className={styles.modalScope}>
      <CollaborationModal title="Información del Estudiante" onClose={onClose}>
        {loading ? (
          <p role="status">Consultando información del estudiante…</p>
        ) : null}
        {error ? (
          <p className={sharedStyles.error} role="alert">
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
                <div>
                  <dt>Estado de ingreso</dt>
                  <dd>
                    <EntryConditionBadge
                      {...entryDisplay(student.entry_status)}
                    />
                  </dd>
                </div>
              </dl>
            </section>
            {student.meets_entry_conditions === true ? (
              <p className={`${styles.message} ${styles.positive}`}>
                El estudiante se encuentra inscrito y habilitado para este
                examen.
              </p>
            ) : null}
            {student.blockers.length > 0 ? (
              <section
                className={`${styles.message} ${styles.blockerMessage}`}
                aria-label="Observaciones del control de ingreso"
              >
                <h3>Observaciones del control de ingreso</h3>
                <ul className={styles.blockers}>
                  {student.blockers.map((blocker, index) => (
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
            {student.entry_status === 'REGISTERED' && student.entry ? (
              <section
                className={styles.message}
                aria-label="Ingreso registrado"
              >
                <h3>Ingreso registrado</h3>
                <dl className={styles.examDetails}>
                  <div>
                    <dt>Fecha y hora de ingreso</dt>
                    <dd>{formatEntryTimestamp(student.entry.entered_at)}</dd>
                  </div>
                  <div>
                    <dt>Método de verificación</dt>
                    <dd>
                      {student.entry.verification_method || 'No informado'}
                    </dd>
                  </div>
                  <div>
                    <dt>Verificado por</dt>
                    <dd>{student.entry.verified_by_name || 'No informado'}</dd>
                  </div>
                </dl>
              </section>
            ) : null}
          </>
        ) : null}
        <div className={`${sharedStyles.actions} ${styles.modalActions}`}>
          <button
            type="button"
            className={sharedStyles.secondaryButton}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </CollaborationModal>
    </div>
  )
}
