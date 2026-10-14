import { useRef, useState } from 'react'
import { useAcademicTermRecord } from '../hooks/useAcademicTermRecord'
import type {
  AcademicTerm,
  AcademicTermSelection,
} from '../types/academicTerm.types'
import { AcademicTermModal } from './AcademicTermModal'
import { AcademicTermForm } from './AcademicTermForm'
import { AcademicTermDetails } from './AcademicTermDetails'
import styles from './AcademicTermModal.module.css'

export function AcademicTermDialog({
  selection,
  onClose,
  onSaved,
}: {
  selection: AcademicTermSelection
  onClose: () => void
  onSaved: (term: AcademicTerm, created: boolean) => void
}) {
  const record = useAcademicTermRecord(
    selection.mode === 'create' ? null : selection.termId,
  )
  const [editing, setEditing] = useState(selection.mode === 'edit')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const title =
    selection.mode === 'create'
      ? 'Registrar periodo'
      : editing
        ? 'Editar periodo'
        : 'Detalle del periodo'
  function close() {
    if (!busy.current) onClose()
  }
  function changeBusy(value: boolean) {
    busy.current = value
    setSaving(value)
  }
  function saved(term: AcademicTerm) {
    onSaved(term, selection.mode === 'create')
  }
  return (
    <AcademicTermModal title={title} busy={saving} onClose={close}>
      {selection.mode === 'create' ? (
        <AcademicTermForm
          onCancel={close}
          onSaved={saved}
          onBusyChange={changeBusy}
        />
      ) : (
        <>
          {!record.state && (
            <p className={styles.loading} role="status">
              Cargando información del periodo…
            </p>
          )}
          {record.state?.status === 'error' && (
            <>
              <div className={styles.error} role="alert">
                <p>{record.state.message}</p>
                {!record.state.unavailable && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={record.reload}
                  >
                    Reintentar detalle
                  </button>
                )}
              </div>
              <footer className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={close}
                >
                  Cerrar
                </button>
              </footer>
            </>
          )}
          {record.state?.status === 'ready' &&
            (editing ? (
              <AcademicTermForm
                term={record.state.term}
                onCancel={close}
                onSaved={saved}
                onBusyChange={changeBusy}
              />
            ) : (
              <AcademicTermDetails
                term={record.state.term}
                onClose={close}
                onEdit={() => {
                  record.reload()
                  setEditing(true)
                }}
              />
            ))}
        </>
      )}
    </AcademicTermModal>
  )
}
