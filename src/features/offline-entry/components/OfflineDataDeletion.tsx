import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { deleteOfflineExam } from '../storage/offlineStore'
import { offlineError } from '../api/offlineApi'
import type { LocalEntry } from '../types/offline.types'
import shared from './styles/OfflineShared.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

export function OfflineDataDeletion({
  ownerId,
  examId,
  entries,
  disabled,
  onDeleted,
}: {
  ownerId: number
  examId: number
  entries: LocalEntry[]
  disabled: boolean
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unresolved = entries.filter(
    (entry) => !['ACCEPTED', 'DUPLICATE'].includes(entry.status),
  ).length

  return (
    <>
      <button
        type="button"
        className={buttons.secondaryButton}
        disabled={disabled}
        onClick={() => {
          setOpen(true)
          setAcknowledged(false)
          setError(null)
        }}
      >
        <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
        <span>Eliminar datos locales de este examen</span>
      </button>

      {open ? (
        <CollaborationModal
          title="Eliminar datos de este dispositivo"
          busy={busy}
          onClose={() => setOpen(false)}
        >
          <p>
            Se eliminarán todas las versiones descargadas y los eventos locales
            de este examen y cuenta. El historial oficial del servidor se
            conserva.
          </p>
          {unresolved > 0 ? (
            <div className={shared.notice} data-warning="true">
              <strong>{unresolved} eventos requieren atención.</strong>
              <p>
                Eliminar pendientes puede perder ingresos que nunca llegaron al
                servidor. También se perderá el seguimiento local de conflictos
                y rechazos.
              </p>
              <label className={shared.checkbox}>
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                Entiendo y acepto la pérdida de los registros locales sin
                resolver.
              </label>
            </div>
          ) : null}
          {error ? (
            <p className={shared.error} role="alert">
              {error}
            </p>
          ) : null}
          <div className={shared.actions}>
            <button
              className={buttons.secondaryButton}
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Conservar datos
            </button>
            <button
              className={buttons.dangerButton}
              disabled={busy || (unresolved > 0 && !acknowledged)}
              onClick={() => {
                setBusy(true)
                void deleteOfflineExam(ownerId, examId, acknowledged)
                  .then(
                    () => {
                      onDeleted()
                      setOpen(false)
                    },
                    (cause: unknown) => setError(offlineError(cause)),
                  )
                  .finally(() => setBusy(false))
              }}
            >
              {busy ? 'Eliminando…' : 'Eliminar del dispositivo'}
            </button>
          </div>
        </CollaborationModal>
      ) : null}
    </>
  )
}