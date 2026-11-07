import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { AnnulEntryConfirmation } from '@/features/entry-annulments/components/AnnulEntryConfirmation'
import type { AnnulmentHistoryRecord } from '@/features/entry-annulments/types/entryAnnulment.types'
import { EntryHistoryRecords } from './EntryHistoryRecords'
import { useEntryHistory } from '../hooks/useEntryHistory'
import sharedStyles from '@/features/collaborations/pages/Collaborations.module.css'
import entryStyles from '../pages/EntryControlPage.module.css'
import styles from './EntryQr.module.css'
import modalStyles from './EntryHistoryModal.module.css'

export function EntryHistoryModal({
  examId,
  onClose,
  onEntriesChanged,
}: {
  examId: number
  onClose: () => void
  onEntriesChanged?: () => void
}) {
  const searchId = useId()
  const layer = useRef<HTMLDivElement>(null)
  const history = useEntryHistory(examId)
  const [selected, setSelected] = useState<AnnulmentHistoryRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const records = history.response?.data ?? []
  const meta = history.response?.meta
  useEffect(() => {
    const dialog = layer.current?.querySelector<HTMLElement>('[role="dialog"]')
    dialog?.focus()
    if (dialog) dialog.scrollTop = 0
  }, [selected])

  function returnToHistory() {
    if (busy) return
    setSelected(null)
    history.reload()
    onEntriesChanged?.()
  }

  return createPortal(
    <div
      ref={layer}
      className={`${modalStyles.layer} ${selected ? modalStyles.confirmation : ''}`}
    >
      <div className={styles.historyModal}>
        <CollaborationModal
          title={
            selected
              ? 'Confirmar anulación de ingreso'
              : 'Historial completo de ingresos'
          }
          busy={busy}
          onClose={() => {
            if (!busy) {
              if (selected) returnToHistory()
              else onClose()
            }
          }}
        >
          {selected ? (
            <AnnulEntryConfirmation
              key={selected.entry.id}
              examId={examId}
              record={selected}
              onBusyChange={setBusy}
              onCancel={returnToHistory}
              onAnnulled={(record) => {
                setBusy(false)
                setSelected(null)
                setNotice(
                  'Ingreso #' +
                    record.entry.id +
                    ' anulado. Se conserva su evidencia original.',
                )
                history.reload()
                onEntriesChanged?.()
              }}
            />
          ) : (
            <>
              {notice && <p role="status">{notice}</p>}
              <div className={modalStyles.toolbar}>
                <div className={entryStyles.field}>
                  <label htmlFor={searchId}>Buscar estudiante</label>
                  <input
                    id={searchId}
                    type="search"
                    placeholder="Nombre, apellido o SIS"
                    value={history.query}
                    onChange={(event) => history.setQuery(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={sharedStyles.secondaryButton}
                  disabled={history.loading}
                  onClick={history.reload}
                >
                  Actualizar historial
                </button>
              </div>
              {history.error && (
                <div role="alert">
                  <p className={sharedStyles.error}>{history.error}</p>
                  <button
                    type="button"
                    className={sharedStyles.secondaryButton}
                    onClick={history.reload}
                  >
                    Reintentar
                  </button>
                </div>
              )}
              <div
                className={styles.historyResults}
                aria-busy={history.loading}
              >
                {history.loading ? (
                  <p className={styles.historyStatus} role="status">
                    Consultando historial…
                  </p>
                ) : records.length ? (
                  <EntryHistoryRecords
                    records={records}
                    onAnnul={(record) => {
                      setNotice(null)
                      setSelected(record)
                    }}
                  />
                ) : !history.error ? (
                  <div className={styles.historyEmpty} role="status">
                    <p className={styles.historyEmptyTitle}>
                      {history.query.trim()
                        ? 'No se encontraron ingresos para esta búsqueda'
                        : 'Aún no hay ingresos registrados'}
                    </p>
                    <p>
                      {history.query.trim()
                        ? 'Prueba con otro nombre, apellido o SIS.'
                        : 'Los ingresos registrados para este examen aparecerán aquí.'}
                    </p>
                  </div>
                ) : null}
              </div>
              {meta && (
                <nav
                  className={entryStyles.pagination}
                  aria-label="Paginación del historial"
                >
                  <p role="status">
                    {meta.total} ingresos · Página {meta.current_page} de{' '}
                    {meta.last_page} · {meta.per_page} por página
                  </p>
                  <div>
                    <button
                      type="button"
                      className={sharedStyles.secondaryButton}
                      disabled={history.loading || meta.current_page <= 1}
                      onClick={() => history.setPage(meta.current_page - 1)}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className={sharedStyles.secondaryButton}
                      disabled={
                        history.loading || meta.current_page >= meta.last_page
                      }
                      onClick={() => history.setPage(meta.current_page + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                </nav>
              )}
              <div className={sharedStyles.actions}>
                <button
                  type="button"
                  className={sharedStyles.secondaryButton}
                  onClick={onClose}
                >
                  Cerrar
                </button>
              </div>
            </>
          )}
        </CollaborationModal>
      </div>
    </div>,
    document.body,
  )
}
