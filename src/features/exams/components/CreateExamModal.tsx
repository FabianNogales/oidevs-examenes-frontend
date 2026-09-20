import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { getRooms } from '@/features/exams/api/teacherExamsApi'
import type {
  CreateExamPayload,
  EvaluationType,
  Room,
} from '@/features/exams/types/exam.types'
import type { Subject } from '@/features/subjects/types/subject.types'

import styles from './CreateExamModal.module.css'

interface CreateExamModalProps {
  isOpen: boolean
  subject: Subject | null
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (payload: CreateExamPayload) => Promise<void>
}

const DEFAULT_FORM = {
  name: '',
  exam_date: '',
  start_time: '',
  duration_minutes: '90',
  evaluation_type: 'partial' as EvaluationType,
  room_id: '',
  rules: '',
}

const EVALUATION_LABELS: Record<EvaluationType, string> = {
  partial: 'Parcial',
  final: 'Final',
  makeup: 'Recuperatorio',
}

export function CreateExamModal({
  isOpen,
  subject,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CreateExamModalProps) {
  const [formValues, setFormValues] = useState(DEFAULT_FORM)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const evaluationTypeId = useId()
  const dateId = useId()
  const timeId = useId()
  const durationId = useId()
  const rulesId = useId()
  const roomId = useId()

  const isSubmitDisabled = useMemo(
    () =>
      isSubmitting ||
      !subject ||
      !formValues.name.trim() ||
      !formValues.exam_date ||
      !formValues.start_time ||
      !formValues.evaluation_type ||
      !formValues.room_id ||
      Number(formValues.duration_minutes) <= 0,
    [formValues, isSubmitting, subject],
  )

  const handleCloseDialog = useCallback(() => {
    setFormValues(DEFAULT_FORM)
    setFieldError(null)
    setRoomError(null)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen || !subject) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        handleCloseDialog()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    requestAnimationFrame(() => firstInputRef.current?.focus())

    const loadRooms = async () => {
      setIsLoadingRooms(true)
      setRoomError(null)

      try {
        const nextRooms = await getRooms()
        setRooms(nextRooms)

        if (nextRooms.length > 0 && !formValues.room_id) {
          setFormValues((current) => ({
            ...current,
            room_id: String(nextRooms[0].id),
          }))
        }
      } catch (error) {
        setRoomError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los ambientes disponibles.',
        )
        setRooms([])
      } finally {
        setIsLoadingRooms(false)
      }
    }

    void loadRooms()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [formValues.room_id, handleCloseDialog, isOpen, isSubmitting, subject])

  if (!isOpen || !subject) {
    return null
  }

  const handleInputChange = (
    field: keyof typeof DEFAULT_FORM,
    value: string,
  ) => {
    setFormValues((current) => ({ ...current, [field]: value }))
    if (fieldError) {
      setFieldError(null)
    }
  }

  const handleSubmit = async () => {
    const trimmedName = formValues.name.trim()
    const duration = Number(formValues.duration_minutes)

    if (!trimmedName) {
      setFieldError('El nombre del examen es obligatorio.')
      return
    }

    if (!formValues.exam_date) {
      setFieldError('La fecha es obligatoria.')
      return
    }

    if (!formValues.start_time) {
      setFieldError('La hora es obligatoria.')
      return
    }

    if (!formValues.evaluation_type) {
      setFieldError('Debes seleccionar el tipo de evaluación.')
      return
    }

    if (!formValues.room_id) {
      setFieldError('Debes seleccionar un ambiente.')
      return
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      setFieldError('La duración debe ser mayor a 0 minutos.')
      return
    }

    if (
      formValues.exam_date &&
      formValues.exam_date < new Date().toISOString().slice(0, 10)
    ) {
      setFieldError('La fecha no puede ser anterior a hoy.')
      return
    }

    setFieldError(null)

    if (isSubmitDisabled) {
      return
    }

    await onSubmit({
      name: trimmedName,
      exam_date: formValues.exam_date,
      start_time: `${formValues.start_time}:00`,
      duration_minutes: duration,
      room_id: Number(formValues.room_id),
      evaluation_type: formValues.evaluation_type,
      rules: formValues.rules.trim() ? formValues.rules.trim() : null,
    })
  }

  return (
    <div className={styles.overlay} aria-modal="true" role="dialog" aria-labelledby="create-exam-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Programación</p>
            <h2 id="create-exam-title">Crear examen</h2>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            aria-label="Cerrar modal"
            onClick={handleCloseDialog}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className={styles.subjectHeader}>
          <strong>{subject.code ?? 'Materia'}</strong>
          <span>— {subject.name}</span>
        </div>

        <p className={styles.term}><span>Gestión</span> {subject.academicManagement}</p>

        <div className={styles.formGrid}>
          <div className={styles.fieldFull}>
            <label htmlFor={nameId}>Nombre del examen *</label>
            <input
              id={nameId}
              ref={firstInputRef}
              type="text"
              maxLength={255}
              value={formValues.name}
              onChange={(event) => handleInputChange('name', event.target.value)}
              placeholder="Ej. Primer parcial"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.fieldHalf}>
            <label htmlFor={evaluationTypeId}>Tipo de evaluación *</label>
            <select
              id={evaluationTypeId}
              value={formValues.evaluation_type}
              onChange={(event) =>
                handleInputChange(
                  'evaluation_type',
                  event.target.value as EvaluationType,
                )
              }
              disabled={isSubmitting}
            >
              {Object.entries(EVALUATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldHalf}>
            <label htmlFor={dateId}>Fecha *</label>
            <input
              id={dateId}
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={formValues.exam_date}
              onChange={(event) => handleInputChange('exam_date', event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.fieldHalf}>
            <label htmlFor={timeId}>Hora *</label>
            <input
              id={timeId}
              type="time"
              value={formValues.start_time}
              onChange={(event) => handleInputChange('start_time', event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.fieldHalf}>
            <label htmlFor={durationId}>Duración (minutos) *</label>
            <input
              id={durationId}
              type="number"
              min={1}
              step={1}
              value={formValues.duration_minutes}
              onChange={(event) => handleInputChange('duration_minutes', event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.fieldHalf}>
            <label htmlFor={roomId}>Ambiente *</label>
            <select
              id={roomId}
              value={formValues.room_id}
              onChange={(event) => handleInputChange('room_id', event.target.value)}
              disabled={isSubmitting || isLoadingRooms || rooms.length === 0}
            >
              {isLoadingRooms ? (
                <option value="">Cargando ambientes...</option>
              ) : rooms.length > 0 ? (
                <>
                  <option value="">Selecciona un ambiente</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={String(room.id)}>
                      {room.code} — {room.name}
                      {room.location ? ` (${room.location})` : ''}
                    </option>
                  ))}
                </>
              ) : (
                <option value="">No hay ambientes disponibles</option>
              )}
            </select>
          </div>

          <div className={styles.fieldFull}>
            <label htmlFor={rulesId}>Normas / restricciones</label>
            <textarea
              id={rulesId}
              rows={4}
              value={formValues.rules}
              onChange={(event) => handleInputChange('rules', event.target.value)}
              placeholder="Ej. Sin calculadoras durante la prueba."
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>Estado inicial</span>
            <span className={styles.badge}>Programado</span>
          </div>
        </div>

        {fieldError ? <p className={styles.inlineError} role="alert">{fieldError}</p> : null}
        {roomError ? <p className={styles.inlineInfo}>{roomError}</p> : null}

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={handleCloseDialog} disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void handleSubmit()}
            disabled={isSubmitDisabled || isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar examen'}
          </button>
        </div>
      </div>
    </div>
  )
}
