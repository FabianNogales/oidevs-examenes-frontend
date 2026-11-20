import { useRef, useState } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getModuleAccess } from '@/features/roles/utils/moduleAccess'
import { useAcademicTermRecord } from '../hooks/useAcademicTermRecord'
import type {
  AcademicTerm,
  AcademicTermSelection,
} from '../types/academicTerm.types'
import { AcademicTermModal } from './AcademicTermModal'
import { AcademicTermForm } from './AcademicTermForm'
import { AcademicTermDetails } from './AcademicTermDetails'
import styles from './AcademicTermModal.module.css'
import { Button } from '@/shared/components/ui/Button/Button'

export function AcademicTermDialog({
  selection,
  onClose,
  onSaved,
}: {
  selection: AcademicTermSelection
  onClose: () => void
  onSaved: (term: AcademicTerm, created: boolean) => void
}) {
  const { user } = useAuth()
  const access = getModuleAccess(user, 'academic_terms')
  const [editing, setEditing] = useState(selection.mode === 'edit')
  const allowed = selection.mode === 'create' ? access.canCreate : editing ? access.canEdit : access.canView
  const record = useAcademicTermRecord(
    selection.mode === 'create' || !allowed ? null : selection.termId, editing,
  )
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
      {!allowed ? <p role="alert">No tienes permiso vigente para esta operación.</p> : selection.mode === 'create' ? (
        <AcademicTermForm
          allowActivation={access.isAdministrator}
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
                  <Button
                    variant="secondary"
                    onClick={record.reload}
                  >
                    Reintentar detalle
                  </Button>
                )}
              </div>
              <footer className={styles.actions}>
                <Button
                  variant="secondary"
                  onClick={close}
                >
                  Cerrar
                </Button>
              </footer>
            </>
          )}
          {record.state?.status === 'ready' &&
            (editing ? (
              <AcademicTermForm
                term={record.state.term}
                allowActivation={access.isAdministrator}
                onCancel={close}
                onSaved={saved}
                onBusyChange={changeBusy}
              />
            ) : (
              <AcademicTermDetails
                term={record.state.term}
                onClose={close}
                onEdit={access.canEdit ? () => {
                  record.reload()
                  setEditing(true)
                } : undefined}
              />
            ))}
        </>
      )}
    </AcademicTermModal>
  )
}
