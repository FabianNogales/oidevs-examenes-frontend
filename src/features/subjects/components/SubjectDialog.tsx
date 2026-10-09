import { useEffect, useRef, useState } from 'react'
import { getAdminSubject, SubjectApiError } from '../api/subjectMutationsApi'
import type {
  AdminSubject,
  SubjectDialogSelection,
} from '../types/adminSubject.types'
import { SubjectDetails } from './SubjectDetails'
import { SubjectForm } from './SubjectForm'
import { SubjectModal } from './SubjectModal'
import styles from './SubjectDialog.module.css'

interface Props {
  selection: SubjectDialogSelection
  onClose: () => void
  onSaved: (subject: AdminSubject, created: boolean) => void
}

type RecordState =
  | { status: 'loading' }
  | { status: 'ready'; subject: AdminSubject }
  | { status: 'error'; message: string; missing: boolean }

function ExistingSubject({
  subjectId,
  editing,
  onClose,
  onEdit,
  onSaved,
  onBusyChange,
}: {
  subjectId: number
  editing: boolean
  onClose: () => void
  onEdit: () => void
  onSaved: (subject: AdminSubject) => void
  onBusyChange: (busy: boolean) => void
}) {
  const [state, setState] = useState<RecordState>({ status: 'loading' })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getAdminSubject(subjectId, controller.signal).then(
      (subject) => {
        if (!controller.signal.aborted) setState({ status: 'ready', subject })
      },
      (cause: unknown) => {
        if (controller.signal.aborted) return
        const error =
          cause instanceof SubjectApiError
            ? cause
            : new SubjectApiError('No se pudo consultar la materia.')
        setState({
          status: 'error',
          message: error.message,
          missing: error.status === 404,
        })
      },
    )
    return () => controller.abort()
  }, [subjectId, retry])

  if (state.status === 'loading')
    return (
      <p className={styles.loading} role="status">
        Cargando información de la materia…
      </p>
    )
  if (state.status === 'error')
    return (
      <div className={styles.error} role="alert">
        <p>{state.message}</p>
        {!state.missing && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setState({ status: 'loading' })
              setRetry((value) => value + 1)
            }}
          >
            Reintentar
          </button>
        )}
      </div>
    )
  return editing ? (
    <SubjectForm
      subject={state.subject}
      onCancel={onClose}
      onSaved={onSaved}
      onBusyChange={onBusyChange}
    />
  ) : (
    <SubjectDetails subject={state.subject} onClose={onClose} onEdit={onEdit} />
  )
}

export function SubjectDialog({ selection, onClose, onSaved }: Props) {
  const busy = useRef(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(selection.mode === 'edit')
  const title =
    selection.mode === 'create'
      ? 'Registrar materia'
      : editing
        ? 'Editar materia'
        : 'Detalle de la materia'

  function close() {
    if (!busy.current) onClose()
  }

  function changeBusy(value: boolean) {
    busy.current = value
    setSaving(value)
  }

  function saved(subject: AdminSubject) {
    onSaved(subject, selection.mode === 'create')
  }

  return (
    <SubjectModal title={title} busy={saving} onClose={close}>
      {selection.mode === 'create' ? (
        <SubjectForm
          onCancel={close}
          onSaved={saved}
          onBusyChange={changeBusy}
        />
      ) : (
        <ExistingSubject
          subjectId={selection.subjectId}
          editing={editing}
          onClose={close}
          onEdit={() => setEditing(true)}
          onSaved={saved}
          onBusyChange={changeBusy}
        />
      )}
    </SubjectModal>
  )
}
