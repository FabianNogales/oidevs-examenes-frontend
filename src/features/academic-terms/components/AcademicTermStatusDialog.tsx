import { useEffect, useRef, useState } from 'react'
import {
  changeAcademicTermStatus,
  mapAcademicTermMutationError,
  type AcademicTermMutationError,
} from '../api/academicTermMutationsApi'
import { useAcademicTermRecord } from '../hooks/useAcademicTermRecord'
import type {
  AcademicTerm,
  AcademicTermStatus,
} from '../types/academicTerm.types'
import { formatAcademicTermDate } from '../utils/academicTermDate'
import { AcademicTermModal } from './AcademicTermModal'
import styles from './AcademicTermModal.module.css'

export function AcademicTermStatusDialog({
  termId,
  targetStatus,
  onClose,
  onSaved,
  onRefresh,
}: {
  termId: number
  targetStatus: AcademicTermStatus
  onClose: () => void
  onSaved: (term: AcademicTerm) => void
  onRefresh: () => void
}) {
  const record = useAcademicTermRecord(termId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<AcademicTermMutationError | null>(null)
  const pending = useRef(false)
  const mounted = useRef(true)
  const activating = targetStatus === 'ACTIVE'
  const action = activating ? 'Activar' : 'Desactivar'
  const term = record.state?.status === 'ready' ? record.state.term : null
  const alreadyChanged = term?.status === targetStatus
  const unavailable = error && [403, 404].includes(error.status ?? 0)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  function close() {
    if (!pending.current) {
      if (alreadyChanged) onRefresh()
      onClose()
    }
  }
  async function confirm() {
    if (pending.current || !term || alreadyChanged || unavailable || error)
      return
    pending.current = true
    setSaving(true)
    try {
      const saved = await changeAcademicTermStatus(termId, targetStatus)
      if (mounted.current) onSaved(saved)
    } catch (cause) {
      if (mounted.current) {
        setError(mapAcademicTermMutationError(cause))
        onRefresh()
      }
    } finally {
      pending.current = false
      if (mounted.current) setSaving(false)
    }
  }
  function refresh() {
    setError(null)
    record.reload()
    onRefresh()
  }
  return (
    <AcademicTermModal
      title={`${action} periodo`}
      busy={saving}
      onClose={close}
    >
      {!record.state && (
        <p role="status" className={styles.loading}>
          Consultando el estado actual…
        </p>
      )}
      {record.state?.status === 'error' && (
        <div role="alert" className={styles.error}>
          <p>{record.state.message}</p>
          {!record.state.unavailable && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={refresh}
            >
              Reintentar consulta
            </button>
          )}
        </div>
      )}
      {term && (
        <>
          <p className={styles.confirmName}>
            <strong>{term.name}</strong>
          </p>
          <p className={styles.help}>
            {formatAcademicTermDate(term.start_date)} -{' '}
            {formatAcademicTermDate(term.end_date)}
          </p>
          {alreadyChanged ? (
            <p role="status" className={styles.help}>
              Este periodo ya está {activating ? 'activo' : 'inactivo'}. No es
              necesario cambiar su estado.
            </p>
          ) : (
            <p className={styles.help}>
              {activating
                ? 'Este periodo quedará activo para las nuevas ofertas académicas. Solo puede existir un periodo activo; los demás no se desactivarán automáticamente.'
                : 'Este periodo quedará inactivo y no podrá usarse para nuevas ofertas académicas. Sus ofertas, exámenes y demás información histórica se conservarán. Puede que no quede ningún periodo activo.'}
            </p>
          )}
        </>
      )}
      {error && (
        <div role="alert" className={styles.error}>
          <p>{error.message}</p>
          {[...new Set(Object.values(error.fieldErrors))].map((message) => (
            <p key={message}>{message}</p>
          ))}
          {error.conflictingPeriod && (
            <p>
              Periodo en conflicto:{' '}
              <strong>{error.conflictingPeriod.name}</strong> (
              {formatAcademicTermDate(error.conflictingPeriod.start_date)} -{' '}
              {formatAcademicTermDate(error.conflictingPeriod.end_date)}).
            </p>
          )}
          {!unavailable && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={refresh}
            >
              Consultar estado actual
            </button>
          )}
        </div>
      )}
      <footer className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={saving}
          onClick={close}
        >
          {alreadyChanged ? 'Cerrar' : 'Cancelar'}
        </button>
        {term && !alreadyChanged && (
          <button
            type="button"
            className={activating ? styles.primaryButton : styles.dangerButton}
            disabled={saving || Boolean(error)}
            onClick={confirm}
          >
            {saving ? 'Guardando…' : `${action} periodo`}
          </button>
        )}
      </footer>
    </AcademicTermModal>
  )
}
